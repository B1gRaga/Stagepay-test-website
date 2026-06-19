-- ================================================================
-- Migration 027: Drop unused columns
--
-- profiles.currency — superseded by profiles.default_currency
-- (migration 007). Never read or written by any live route/component.
--
-- invoices.whatsapp_sent_at / invoices.whatsapp_to — added in
-- migration 002 to track WhatsApp delivery on the invoice row, but
-- app/api/whatsapp/send never writes either; the recipient phone is
-- resolved from client_phone at send-time instead.
-- ================================================================

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS currency;

ALTER TABLE public.invoices
  DROP COLUMN IF EXISTS whatsapp_sent_at,
  DROP COLUMN IF EXISTS whatsapp_to;
