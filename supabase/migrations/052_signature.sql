-- 052: A signature or stamp on invoices and receipts.
--
-- The business uploads its signature (or the school's stamp) once; it prints
-- on every invoice and receipt above an "Authorised by" line, with the name
-- and title under it. The image lives in the existing public `logos` bucket
-- under the account's own folder (<account id>/signature.<ext>), so the
-- bucket's upload / update / delete rules from 011 and 042 already apply.
--
-- SAFE TO RE-RUN.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signature_url  TEXT,
  ADD COLUMN IF NOT EXISTS signature_name TEXT;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_signature_name_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_signature_name_len
  CHECK (signature_name IS NULL OR char_length(signature_name) <= 60);

-- profiles is updated column by column (009/014/033): a new column is
-- read-only for the app until it is granted, like invoice_paper_size in 036.
GRANT UPDATE (signature_url, signature_name) ON public.profiles TO authenticated;
