-- 054: Verification for tutors who aren't registered with CIPA.
--
-- A business verifies one of two ways:
--   company    — CIPA certificate + registration number (053)
--   individual — the owner's Omang: full name, Omang number and a photo of
--                the card, checked against the payment account on their
--                invoices (it must be in that person's name).
--
-- An Omang is sensitive, so for individuals StagePay keeps as little as it
-- can: once a decision is made the photo is deleted from storage and the
-- number is cut to its last 4 digits (done by the app, see
-- app/api/admin/verifications). certificate_path then reads 'removed'.
--
-- SAFE TO RE-RUN.

ALTER TABLE public.business_verifications
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'company';

ALTER TABLE public.business_verifications DROP CONSTRAINT IF EXISTS business_verifications_kind_check;
ALTER TABLE public.business_verifications ADD CONSTRAINT business_verifications_kind_check
  CHECK (kind IN ('company', 'individual'));
