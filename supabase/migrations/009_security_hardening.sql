-- ================================================================
-- Migration 009: Security hardening
--
-- 1. profiles: restrict UPDATE to non-sensitive columns only
--    (plan, subscription_expires_at, dpo_transaction_ref must only
--     be written by service-role / SECURITY DEFINER functions)
-- 2. profiles: add pending_plan column for safe checkout flow
-- 3. invoices/invoice_items: remove dangerous anon policies that
--    exposed all rows to anyone with the anon key
-- 4. Add get_invoice_by_token() RPC for safe public lookups
-- 5. Fix next_invoice_number() to use auth.uid() internally
--    so callers cannot increment another user's counter
-- ================================================================

-- ── 1. PROFILES — column-level privilege lock-down ────────────────
-- Revoke the blanket UPDATE that lets authenticated users write any
-- column (including plan, subscription_expires_at, dpo_transaction_ref).
-- Grant back only the columns users are legitimately allowed to change.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (
  name, firm_name, phone, address, city, country,
  vat_number, logo_url, default_currency, tax_label,
  default_vat_rate
) ON public.profiles TO authenticated;

-- Sensitive columns (plan, subscription_expires_at, dpo_transaction_ref,
-- pending_plan, two_fa_enabled, email) are now writable only by
-- service_role (used in server-side route handlers).

-- ── 2. PROFILES — add pending_plan for safe checkout tracking ─────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_plan TEXT
    CHECK (pending_plan IS NULL OR pending_plan IN ('pro', 'business'));

-- ── 3. INVOICES — remove dangerous anon read policies ─────────────
-- These policies matched EVERY row because public_token IS NOT NULL
-- is always true (default value is always set). Anyone with the anon
-- key could enumerate all invoices from all users via REST.
DROP POLICY IF EXISTS "invoices: public read by token"              ON public.invoices;
DROP POLICY IF EXISTS "invoice_items: public read via invoice token" ON public.invoice_items;

-- The public invoice page (app/invoice/[token]/page.tsx) uses the
-- service-role client server-side and is unaffected by this removal.

-- ── 4. get_invoice_by_token() — safe public lookup RPC ───────────
-- Accepts the token as an explicit parameter so the lookup is always
-- token-scoped. Callable by the anon role; returns nothing on a miss.
CREATE OR REPLACE FUNCTION public.get_invoice_by_token(p_token TEXT)
RETURNS SETOF public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT * FROM public.invoices WHERE public_token = p_token;
END;
$$;

-- Allow the anon role to call this function (safe — token-scoped)
REVOKE ALL  ON FUNCTION public.get_invoice_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_by_token(TEXT) TO anon, authenticated;

-- ── 5. next_invoice_number() — enforce caller owns the counter ────
-- Previous version accepted p_user_id as a parameter, letting any
-- authenticated caller increment another user's counter. Now the
-- function reads auth.uid() directly and ignores the parameter.
-- The parameter is kept for backwards compatibility with callers.
CREATE OR REPLACE FUNCTION public.next_invoice_number(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller  UUID;
  v_counter INT;
  v_ym      TEXT;
BEGIN
  -- Always use the authenticated caller's UID, never the parameter
  v_caller := auth.uid();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.invoice_counters (user_id, counter)
  VALUES (v_caller, 1)
  ON CONFLICT (user_id) DO UPDATE
    SET counter = invoice_counters.counter + 1
  RETURNING counter INTO v_counter;

  v_ym := TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMM');
  RETURN 'INV-' || v_ym || '-' || LPAD(v_counter::TEXT, 3, '0');
END;
$$;
