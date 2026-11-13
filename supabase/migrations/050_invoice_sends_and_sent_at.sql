-- ================================================================
-- Migration 050: Sending a whole class on WhatsApp, and when an invoice went out
--
-- 1. invoices.sent_at / sent_via — when the invoice first went out and how
--    ('whatsapp' = StagePay's number through the Cloud API, 'whatsapp_link' =
--    the business's own phone through wa.me, 'email'). An invoice that is paid
--    with no sent_at was paid at the counter: no invoice was ever sent.
--
-- 2. invoice_sends — one row per message StagePay itself sends for an invoice
--    (bulk WhatsApp sends). It keeps Meta's message id so delivery reports
--    (delivered / read / failed) can be matched back, and it is what the daily
--    WhatsApp recipient cap is counted from.
--
-- SAFE TO RE-RUN.
-- ================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sent_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_via TEXT;

ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_sent_via_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_sent_via_check
  CHECK (sent_via IS NULL OR sent_via IN ('whatsapp', 'whatsapp_link', 'email'));

-- Everything that is not a draft went out before this column existed. Date it
-- by the email send when there was one, otherwise by when it was made (an
-- invoice is nearly always sent the moment it is created).
UPDATE public.invoices
   SET sent_at  = COALESCE(email_sent_at, created_at),
       sent_via = CASE WHEN email_sent_at IS NOT NULL THEN 'email' ELSE 'whatsapp_link' END
 WHERE status IN ('sent', 'overdue', 'paid')
   AND sent_at IS NULL;

CREATE TABLE IF NOT EXISTS public.invoice_sends (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'email')),
  recipient           TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  provider_message_id TEXT,
  error               TEXT CHECK (char_length(error) <= 500),
  batch_id            UUID,
  created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS invoice_sends_invoice_idx  ON public.invoice_sends (invoice_id, created_at);
CREATE INDEX IF NOT EXISTS invoice_sends_message_idx  ON public.invoice_sends (provider_message_id);
CREATE INDEX IF NOT EXISTS invoice_sends_recent_idx   ON public.invoice_sends (created_at);

ALTER TABLE public.invoice_sends ENABLE ROW LEVEL SECURITY;

-- People in the account can see what was sent for their invoices. Only the
-- server (service role) writes rows: a send is something StagePay did.
DROP POLICY IF EXISTS "invoice_sends: account read" ON public.invoice_sends;
CREATE POLICY "invoice_sends: account read" ON public.invoice_sends FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_account_id()));

REVOKE ALL ON public.invoice_sends FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.invoice_sends TO authenticated;
GRANT ALL    ON public.invoice_sends TO service_role;

-- Audit it like the other business tables (047).
DROP TRIGGER IF EXISTS audit_invoice_sends ON public.invoice_sends;
CREATE TRIGGER audit_invoice_sends AFTER INSERT OR UPDATE OR DELETE ON public.invoice_sends
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
