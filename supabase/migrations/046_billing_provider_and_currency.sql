-- Plan payments can be taken by more than one provider (DPO today; RealPay once
-- StagePay is registered: BILLING_PROVIDER in lib/billing/provider.ts) and in
-- more than one currency. Checkout records which provider and currency a
-- pending payment was started with, so /api/billing/verify and the
-- billing-reconcile cron confirm it with the right one.
-- dpo_transaction_ref keeps its name and holds whichever provider's reference.
-- Like pending_plan, only service_role writes these: the authenticated role's
-- UPDATE grant is a column list (migrations 009/033) that they aren't on.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_provider TEXT
    CHECK (pending_provider IS NULL OR pending_provider IN ('dpo', 'realpay')),
  ADD COLUMN IF NOT EXISTS pending_currency TEXT
    CHECK (pending_currency IS NULL OR pending_currency ~ '^[A-Z]{3}$');
