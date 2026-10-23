-- Who an invoice is billed for, when that is not the client paying it: the
-- student a parent pays tuition for, or the project a contractor bills.
-- Optional; the label shown with it comes from the profile's business_type.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS billed_for text;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_billed_for_length;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_billed_for_length CHECK (char_length(billed_for) <= 100);
