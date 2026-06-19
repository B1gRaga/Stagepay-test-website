-- ================================================================
-- Migration 024: Track when a DPO payment token was issued
--
-- Needed so the billing-reconcile cron can tell which pending checkouts
-- are old enough to be worth re-verifying with DPO (and which are old
-- enough to be abandoned and safe to clear). Service-role-only by
-- default — new columns aren't covered by migration 009's explicit
-- authenticated GRANT UPDATE column list.
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dpo_token_created_at TIMESTAMPTZ;
