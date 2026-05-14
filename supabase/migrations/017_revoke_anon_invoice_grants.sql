-- ================================================================
-- Migration 017: Revoke anon SELECT on invoices and invoice_items
--
-- Migration 016 granted SELECT on invoices and invoice_items to the
-- anon role, with the comment that an RLS policy would filter rows.
-- However, that RLS policy ("invoices: public read by token") was
-- explicitly dropped in migration 009 as too permissive (it matched
-- every row because public_token IS NOT NULL is always true).
--
-- Without the protecting policy, anon SELECT = full table exposure:
-- any caller using the Supabase anon key (which is embedded in
-- client-side JavaScript) can read every invoice and invoice item
-- for every user via the PostgREST REST API.
--
-- The public invoice page (app/invoice/[token]/page.tsx) uses the
-- service_role client server-side and does NOT require anon SELECT
-- at the database level. Revoking these grants closes the data
-- exposure without breaking any application functionality.
--
-- SAFE TO RE-RUN: REVOKE on a privilege that no longer exists is
-- a no-op in PostgreSQL — not an error.
-- ================================================================

REVOKE SELECT ON public.invoices      FROM anon;
REVOKE SELECT ON public.invoice_items FROM anon;
