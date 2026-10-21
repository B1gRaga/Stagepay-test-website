-- Invoice paper size: A4 (the default) or A5, chosen in Settings → Branding.
-- Changed by the app through /api/profile like the other branding columns, so
-- it is added to the column grant from migration 033.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS invoice_paper_size text NOT NULL DEFAULT 'A4';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_invoice_paper_size_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_invoice_paper_size_check CHECK (invoice_paper_size IN ('A4', 'A5'));

GRANT UPDATE (invoice_paper_size) ON public.profiles TO authenticated;
