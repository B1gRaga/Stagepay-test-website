-- ================================================================
-- Migration 015: Fix remaining SECURITY DEFINER warnings
--
-- Root cause: migration 009 used explicit GRANT TO anon, authenticated
-- for get_invoice_by_token. Migration 014's REVOKE FROM PUBLIC only
-- removes the PUBLIC pseudo-role grant, not explicit role grants.
--
-- This migration:
-- 1. Explicitly revokes anon + authenticated from all four functions
-- 2. Rewrites next_invoice_number to work with service_role callers
--    (auth.uid() is NULL under service_role; fall back to parameter)
-- ================================================================

-- ── 1. get_invoice_by_token ──────────────────────────────────────
-- 009 did: GRANT EXECUTE TO anon, authenticated
-- 014 did: REVOKE FROM PUBLIC — didn't clear those explicit grants
-- Fix: revoke the explicit role grants; keep service_role from 014.
REVOKE EXECUTE ON FUNCTION public.get_invoice_by_token(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invoice_by_token(TEXT) FROM authenticated;

-- ── 2. handle_new_user ───────────────────────────────────────────
-- Trigger-only function. Revoke the default PUBLIC grant first —
-- individual role revokes have no effect while PUBLIC still holds it.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;

-- ── 3. next_invoice_number ───────────────────────────────────────
-- /api/invoices/route.ts now calls this via the service-role client.
-- Revoke the default PUBLIC grant first, then grant only service_role.
REVOKE ALL ON FUNCTION public.next_invoice_number(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_invoice_number(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.next_invoice_number(UUID) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.next_invoice_number(UUID) TO service_role;

-- Rewrite the function body: auth.uid() is NULL when called by
-- service_role, so fall back to the explicit parameter. This is safe
-- because only service_role (and superuser) can reach this function now.
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
  -- auth.uid() is NULL when called by service_role; use parameter instead.
  -- Authenticated direct callers are revoked, so only trusted server code
  -- reaches here and the parameter value is pre-verified.
  v_caller := COALESCE(auth.uid(), p_user_id);
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'user_id required';
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

-- ── 4. rls_auto_enable ───────────────────────────────────────────
-- Re-apply in case 014 didn't land cleanly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated';
  END IF;
END
$$;
