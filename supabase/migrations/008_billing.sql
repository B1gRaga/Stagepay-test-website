-- ================================================================
-- Migration 008: DPO Pay subscription billing
--
-- 1. profiles: add subscription_expires_at, dpo_transaction_ref
-- 2. Auto-downgrade plan when subscription expires
-- ================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dpo_transaction_ref       TEXT;
