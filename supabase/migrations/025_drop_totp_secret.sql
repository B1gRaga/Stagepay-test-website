-- ================================================================
-- Migration 025: Drop the unused totp_secret column
--
-- 2FA is fully delegated to Supabase Auth's own MFA system
-- (auth.mfa.enroll/challenge/verify), which stores TOTP secrets in
-- Supabase's own encrypted auth.mfa_factors table. profiles.totp_secret
-- (added in migration 005) is never read or written by any live route
-- or component — dropping it removes a plaintext-secret column that
-- serves no purpose rather than encrypting something nothing uses.
-- ================================================================

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS totp_secret;
