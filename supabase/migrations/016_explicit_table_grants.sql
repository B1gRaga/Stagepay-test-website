-- ================================================================
-- Migration 016: Explicit table grants for Supabase Data API
--
-- Supabase is removing the legacy default that exposed all public
-- schema tables to all roles. From May 30 (new projects) and
-- October 30, 2026 (existing projects), tables require explicit
-- GRANTs or PostgREST returns a 42501 error.
--
-- SAFE TO RE-RUN: GRANT is idempotent — granting a privilege that
-- already exists is a no-op, not an error. This migration never
-- revokes anything, so it cannot break existing access.
--
-- Role reference:
--   anon          — unauthenticated requests (public invoice links)
--   authenticated — logged-in users via supabase-js session
--   service_role  — server-side API routes and cron jobs (bypasses RLS)
-- ================================================================

-- ── profiles ─────────────────────────────────────────────────────
-- anon:          no access (no public profile endpoint exists)
-- authenticated: read + write own row (RLS enforces auth.uid() = id)
--                no DELETE — profiles are deleted via auth.users cascade
-- service_role:  full access (layout.tsx reads profile server-side)

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL                     ON public.profiles TO service_role;

-- ── clients ──────────────────────────────────────────────────────
-- anon:          no access
-- authenticated: read + write (soft-delete = UPDATE deleted_at;
--                no hard DELETE policy exists in 006)
-- service_role:  full access

GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL                     ON public.clients TO service_role;

-- ── invoices ─────────────────────────────────────────────────────
-- anon:          SELECT only — public invoice token links
--                (RLS policy "invoices: public read by token" filters rows)
-- authenticated: full CRUD (RLS policy enforces auth.uid() = user_id)
-- service_role:  full access (cron reminders, PDF generation, mark-paid)

GRANT SELECT                           ON public.invoices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.invoices TO authenticated;
GRANT ALL                              ON public.invoices TO service_role;

-- ── invoice_items ─────────────────────────────────────────────────
-- anon:          SELECT only — needed to render the public invoice view
--                (RLS policy "invoice_items: public read via invoice token")
-- authenticated: full CRUD (RLS enforces auth.uid() = user_id)
-- service_role:  full access

GRANT SELECT                           ON public.invoice_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.invoice_items TO authenticated;
GRANT ALL                              ON public.invoice_items TO service_role;

-- ── reminders ─────────────────────────────────────────────────────
-- anon:          no access
-- authenticated: full CRUD (RLS enforces auth.uid() = user_id)
-- service_role:  full access (cron job reads + updates reminders)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL                             ON public.reminders TO service_role;

-- ── invoice_counters ──────────────────────────────────────────────
-- anon:          no access
-- authenticated: SELECT only — counter writes go exclusively through
--                next_invoice_number() which is SECURITY DEFINER and
--                restricted to service_role (migration 015)
-- service_role:  full access (next_invoice_number runs as service_role)

GRANT SELECT ON public.invoice_counters TO authenticated;
GRANT ALL    ON public.invoice_counters TO service_role;
