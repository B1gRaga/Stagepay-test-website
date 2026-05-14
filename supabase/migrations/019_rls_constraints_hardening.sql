-- ================================================================
-- Migration 019: FORCE RLS, unique invoice numbers, billing constraints
--
-- Three independent hardening changes:
--
-- 1. FORCE ROW LEVEL SECURITY on all user-data tables.
--    Without FORCE, a session running as the table owner (postgres)
--    bypasses RLS entirely. FORCE ensures RLS applies to every role
--    except those with explicit BYPASSRLS (service_role, postgres
--    superuser) which are unaffected by application code.
--
-- 2. UNIQUE(user_id, invoice_number) on invoices.
--    The application generates unique numbers via next_invoice_number(),
--    but without a DB constraint a direct API call or a bug in the
--    generator could silently insert duplicates. Duplicate invoice
--    numbers are an accounting integrity violation.
--    NOTE: This will fail if duplicate (user_id, invoice_number) pairs
--    already exist. Resolve any duplicates before running this migration.
--
-- 3. CHECK constraints on profiles.plan and profiles.subscription_status.
--    These columns are free-text today — any string is accepted.
--    A bug in the billing callback could write an invalid value and
--    silently break all feature gating. The constraints make that
--    impossible at the database level.
-- ================================================================

-- ── 1. FORCE ROW LEVEL SECURITY ───────────────────────────────────
-- Idempotent: applying FORCE to a table that already has it is a no-op.

ALTER TABLE public.profiles        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.clients         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoices        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reminders       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counters FORCE ROW LEVEL SECURITY;

-- ── 2. UNIQUE invoice number per user ─────────────────────────────
-- Prevents duplicate invoice numbers regardless of how the insert
-- reaches the database (application, direct API, migration scripts).

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_user_number_unique;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_user_number_unique
  UNIQUE (user_id, invoice_number);

-- ── 3. Billing field CHECK constraint ────────────────────────────
-- profiles.plan is free-text with no constraint. Lock it to the
-- three valid values so a billing bug cannot write an invalid plan.
-- (subscription_status does not exist in this schema — billing uses
--  subscription_expires_at + plan only.)
-- Drop first so this migration is safe to re-run.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('free', 'pro', 'business'));
