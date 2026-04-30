-- ================================================================
-- Migration 001: Server-side plan limit enforcement
--
-- Adds an INSERT CHECK policy on the invoices table so that
-- free-plan users are limited to 2 invoices per calendar month.
-- This is the authoritative enforcement; client-side checks are
-- UX-only and cannot be trusted.
--
-- Run this in the Supabase SQL editor:
--   Dashboard → SQL Editor → paste & run
-- ================================================================

-- Make this idempotent so it can be re-run safely
DROP POLICY IF EXISTS "enforce_plan_invoice_limit" ON public.invoices;

CREATE POLICY "enforce_plan_invoice_limit" ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
  -- Non-free plans: always allowed
  COALESCE(
    (SELECT plan FROM public.profiles WHERE id = auth.uid()),
    'free'
  ) IN ('pro', 'business')

  OR

  -- Free plan: at most 2 invoices created in the current calendar month.
  -- Uses created_at (server timestamp) so the user cannot backdate to bypass.
  (
    SELECT COUNT(*)
    FROM public.invoices
    WHERE user_id  = auth.uid()
      AND TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM')
          = TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM')
  ) < 5
);

-- ----------------------------------------------------------------
-- Verify the policy was created
-- ----------------------------------------------------------------
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'invoices' AND policyname = 'enforce_plan_invoice_limit';
