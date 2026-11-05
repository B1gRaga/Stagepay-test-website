-- Part payments: each payment against an invoice, with the day it came in.
-- The invoice is paid once its payments add up to its total. Marking an
-- invoice paid records the balance as one payment, so every paid invoice has
-- dated payments and "money received" can be reported for any period.

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_on     DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT CHECK (char_length(note) <= 60),
  created_by  UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON public.invoice_payments (invoice_id);
CREATE INDEX IF NOT EXISTS invoice_payments_account_day_idx ON public.invoice_payments (user_id, paid_on);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Recorded and removed along with their invoice by anyone in the account.
DROP POLICY IF EXISTS "invoice_payments: account access" ON public.invoice_payments;
CREATE POLICY "invoice_payments: account access" ON public.invoice_payments FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));

-- No UPDATE: a wrong payment is removed and recorded again.
REVOKE ALL ON public.invoice_payments FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL                    ON public.invoice_payments TO service_role;

-- Invoices already paid get one payment for their total, dated the day they
-- were last changed (when they were marked paid, for nearly all of them).
INSERT INTO public.invoice_payments (invoice_id, user_id, amount, paid_on, created_by)
SELECT i.id, i.user_id, i.total, i.updated_at::date, i.created_by
FROM public.invoices i
WHERE i.status = 'paid' AND i.total > 0
  AND NOT EXISTS (SELECT 1 FROM public.invoice_payments p WHERE p.invoice_id = i.id);
