-- "I've paid": the client says on their invoice page that they paid (MyZaka,
-- Orange Money, EFT), with the transaction reference from their SMS. The
-- business checks it and confirms, which marks the invoice paid, or clears it.
-- Written by the public claim route with the service role.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_claim_ref  text;

ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_payment_claim_ref_length;
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_payment_claim_ref_length CHECK (char_length(payment_claim_ref) <= 60);
