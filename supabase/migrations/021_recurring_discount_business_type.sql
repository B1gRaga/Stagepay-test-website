-- ================================================================
-- Migration 021: Recurring invoices, discount, and business type
--
-- Adds:
--   profiles.business_type          — onboarding categorisation
--   invoices.discount_amount        — flat discount before VAT
--   invoices.is_recurring           — flag template invoices
--   invoices.recurrence_interval    — monthly | quarterly | yearly
--   invoices.next_recurring_date    — when to generate the next copy
--
-- Updates handle_new_user() to capture business_type from signup metadata.
--
-- SAFE TO RE-RUN: all statements use IF NOT EXISTS / OR REPLACE.
-- ================================================================

-- ── profiles: business type ───────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_type TEXT
    CHECK (business_type IN ('tuition_centre','contractor','freelancer','salon','agency','other'));

-- ── invoices: discount ────────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0
    CHECK (discount_amount >= 0);

-- ── invoices: recurring ───────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS recurrence_interval TEXT DEFAULT 'monthly'
    CHECK (recurrence_interval IN ('monthly','quarterly','yearly'));

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS next_recurring_date DATE;

-- Index so the cron can cheaply find templates due for generation
CREATE INDEX IF NOT EXISTS idx_invoices_recurring_due
  ON public.invoices (next_recurring_date)
  WHERE is_recurring = true;

-- ── Update handle_new_user to save business_type ──────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, business_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NULLIF(NEW.raw_user_meta_data->>'business_type', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
