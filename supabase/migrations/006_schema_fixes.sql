-- ================================================================
-- Migration 006: Schema fixes for pre-launch
--
-- 1. Fix invoice status enum — add 'sent' and 'cancelled'
-- 2. Add invoice_counters table + atomic number function
-- 3. Add UNIQUE constraint on (user_id, invoice_number)
-- 4. Add soft-delete to clients
-- ================================================================

-- ── 1. FIX INVOICE STATUS ENUM ───────────────────────────────────
-- The inline CHECK constraint is auto-named 'invoices_status_check'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled'));

-- Migrate legacy 'pending' rows (created before this fix) to 'sent'
UPDATE public.invoices SET status = 'sent' WHERE status = 'pending';

-- ── 2. ATOMIC INVOICE NUMBER COUNTER ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  user_id  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  counter  INT NOT NULL DEFAULT 0
);

ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoice_counters: owner access" ON public.invoice_counters;
CREATE POLICY "invoice_counters: owner access" ON public.invoice_counters
  FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed counters for existing users so numbering continues from where they left off
INSERT INTO public.invoice_counters (user_id, counter)
  SELECT user_id, COUNT(*) FROM public.invoices GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET counter = EXCLUDED.counter;

-- Atomic function: increments counter and returns formatted invoice number
-- Safe under concurrent creates — uses upsert which is atomic in Postgres
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counter INT;
  v_ym      TEXT;
BEGIN
  INSERT INTO public.invoice_counters (user_id, counter)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET counter = invoice_counters.counter + 1
  RETURNING counter INTO v_counter;

  v_ym := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMM');
  RETURN 'INV-' || v_ym || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$;

-- ── 3. UNIQUE CONSTRAINT ON INVOICE NUMBER ────────────────────────
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_user_number_unique;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_user_number_unique UNIQUE (user_id, invoice_number);

-- ── 4. SOFT DELETE ON CLIENTS ─────────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Rebuild RLS to exclude soft-deleted rows from reads and updates
DROP POLICY IF EXISTS "clients: owner full access" ON public.clients;

-- SELECT / UPDATE / DELETE: only non-deleted rows are visible
CREATE POLICY "clients: owner read non-deleted" ON public.clients
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "clients: owner insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clients: owner update" ON public.clients
  FOR UPDATE TO authenticated
  USING  (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy allows setting deleted_at (soft delete via UPDATE)
-- Hard DELETE is blocked by removing the DELETE policy — use soft delete only
