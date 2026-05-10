-- ================================================================
-- Migration 007: International support + reminder execution columns
--
-- 1. profiles: add default_currency, tax_label, default_vat_rate
-- 2. reminders: add sent_at, error_message for cron tracking
-- ================================================================

-- ── 1. PROFILE INTERNATIONALISATION FIELDS ────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_currency  TEXT    NOT NULL DEFAULT 'P',
  ADD COLUMN IF NOT EXISTS tax_label         TEXT    NOT NULL DEFAULT 'VAT',
  ADD COLUMN IF NOT EXISTS default_vat_rate  NUMERIC NOT NULL DEFAULT 14;

-- ── 2. REMINDER EXECUTION TRACKING ───────────────────────────────
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update status check to allow 'failed'
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS reminders_status_check;
ALTER TABLE public.reminders
  ADD CONSTRAINT reminders_status_check
  CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed'));
