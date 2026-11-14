-- 053: Business verification.
--
-- Before a business can send from StagePay's own WhatsApp number (one-off
-- sends and bulk sends to a class), StagePay checks it is real: the business
-- uploads its CIPA certificate and registration number, StagePay looks it up
-- on CIPA's register and checks the payment account name on its invoices
-- matches, then approves or declines. Automatic reminders don't need it.
--
-- One row per business account. The app reads and writes it only through
-- its own server routes (service role), so the table has RLS on and no
-- policies for app users; certificates sit in a PRIVATE bucket that only
-- the service role can read.
--
-- SAFE TO RE-RUN.

CREATE TABLE IF NOT EXISTS public.business_verifications (
  account_id          uuid        PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  registration_number text        NOT NULL CHECK (char_length(registration_number) BETWEEN 3 AND 40),
  registered_name     text        NOT NULL CHECK (char_length(registered_name) BETWEEN 2 AND 120),
  submitter_name      text        NOT NULL CHECK (char_length(submitter_name) BETWEEN 2 AND 80),
  submitter_role      text        CHECK (submitter_role IS NULL OR char_length(submitter_role) <= 60),
  certificate_path    text        NOT NULL,
  submitted_by        uuid        NOT NULL REFERENCES auth.users(id),
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at         timestamptz,
  reviewed_by         text,
  decision_note       text        CHECK (decision_note IS NULL OR char_length(decision_note) <= 500)
);

CREATE INDEX IF NOT EXISTS business_verifications_status_idx
  ON public.business_verifications (status, submitted_at DESC);

ALTER TABLE public.business_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_verifications FROM anon, authenticated;

-- Private bucket: PDFs and photos of certificates, 5 MB each. No storage
-- policies are added, so only the service role can read or write it.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-docs', 'verification-docs', false, 5242880,
        ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
