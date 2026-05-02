-- ================================================================
-- Migration 002: Phase 1 full schema
-- Tables: profiles, clients, invoices, invoice_items, reminders
-- Run in Supabase SQL editor: Dashboard → SQL Editor → paste & run
--
-- SAFE TO RE-RUN: drops and recreates all Phase 1 tables.
-- After running this, re-run 001_enforce_plan_invoice_limit.sql
-- (it's idempotent — DROP POLICY IF EXISTS at the top).
-- ================================================================

-- ── Enable extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop everything in reverse dependency order ───────────────────────
-- DROP TABLE CASCADE removes triggers automatically; no need to drop them separately.
DROP TABLE IF EXISTS public.reminders     CASCADE;
DROP TABLE IF EXISTS public.invoice_items CASCADE;
DROP TABLE IF EXISTS public.invoices      CASCADE;
DROP TABLE IF EXISTS public.clients       CASCADE;
DROP TABLE IF EXISTS public.profiles      CASCADE;

-- Drop the auth trigger separately since auth.users is not dropped
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at()  CASCADE;

-- ── PROFILES ──────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  name            TEXT,
  firm_name       TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT DEFAULT 'Botswana',
  vat_number      TEXT,
  currency        TEXT DEFAULT 'P',
  logo_url        TEXT,
  plan            TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: owner full access" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── CLIENTS ───────────────────────────────────────────────────────────
CREATE TABLE public.clients (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  country         TEXT,
  vat_number      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: owner full access" ON public.clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── INVOICES ──────────────────────────────────────────────────────────
CREATE TABLE public.invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Invoice identity
  invoice_number  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','overdue','paid')),

  -- Client snapshot (in case client is later edited/deleted)
  client_name     TEXT NOT NULL,
  client_email    TEXT,
  client_phone    TEXT,
  client_address  TEXT,
  client_vat      TEXT,

  -- Project
  project         TEXT,
  notes           TEXT,

  -- Dates
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,

  -- Amounts
  subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate        NUMERIC(5,2)  NOT NULL DEFAULT 14,
  vat_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  deposit_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'P',

  -- Delivery
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_to      TEXT,
  public_token     TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices: owner full access" ON public.invoices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read via token (for shareable invoice links)
CREATE POLICY "invoices: public read by token" ON public.invoices
  FOR SELECT TO anon
  USING (public_token IS NOT NULL);

-- ── INVOICE ITEMS ─────────────────────────────────────────────────────
CREATE TABLE public.invoice_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_items: owner full access" ON public.invoice_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "invoice_items: public read via invoice token" ON public.invoice_items
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
        AND invoices.public_token IS NOT NULL
    )
  );

-- ── REMINDERS ─────────────────────────────────────────────────────────
CREATE TABLE public.reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,

  send_at         TIMESTAMPTZ NOT NULL,
  days_after_due  INT,

  channel         TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','email')),
  recipient_phone TEXT,
  recipient_email TEXT,

  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','failed','cancelled')),
  sent_at         TIMESTAMPTZ,
  message_preview TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders: owner full access" ON public.reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_profiles  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_clients   BEFORE UPDATE ON public.clients   FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_invoices  BEFORE UPDATE ON public.invoices  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_reminders BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── INDEXES ───────────────────────────────────────────────────────────
CREATE INDEX idx_clients_user        ON public.clients(user_id);
CREATE INDEX idx_invoices_user       ON public.invoices(user_id);
CREATE INDEX idx_invoices_client     ON public.invoices(client_id);
CREATE INDEX idx_invoices_status     ON public.invoices(status);
CREATE INDEX idx_invoices_token      ON public.invoices(public_token);
CREATE INDEX idx_invoice_items_inv   ON public.invoice_items(invoice_id);
CREATE INDEX idx_reminders_user      ON public.reminders(user_id);
CREATE INDEX idx_reminders_invoice   ON public.reminders(invoice_id);
CREATE INDEX idx_reminders_status    ON public.reminders(status);
CREATE INDEX idx_reminders_send_at   ON public.reminders(send_at);
