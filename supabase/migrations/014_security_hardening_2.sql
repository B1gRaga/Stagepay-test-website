-- ================================================================
-- Migration 014: Security hardening — fix security advisor warnings
--
-- 1. Logos bucket: drop overly-broad SELECT policy
-- 2. handle_new_user(): revoke REST access (trigger-only function)
-- 3. get_invoice_by_token(): revoke PUBLIC/anon REST access
--    (public invoice page uses service-role client server-side)
-- 4. next_invoice_number(): revoke anon access
--    (authenticated access kept — called by /api/invoices)
-- 5. rls_auto_enable(): revoke if present in public schema
-- 6. profiles UPDATE GRANT: add columns added since migration 009
-- ================================================================

-- ── 1. LOGOS BUCKET — replace broad SELECT with scoped policy ────
-- The public bucket serves URLs via CDN without any RLS SELECT policy.
-- The broad "for select using (bucket_id = 'logos')" exposed the full
-- storage REST endpoint to anon, allowing enumeration of all logos.
DROP POLICY IF EXISTS "Logos are publicly readable" ON storage.objects;

-- ── 2. handle_new_user() — trigger function, no REST access needed ─
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ── 3. get_invoice_by_token() — service-role serves invoice pages ──
-- The function was designed for anon REST access, but the public invoice
-- page (app/invoice/[token]/page.tsx) fetches via the service-role
-- client server-side. No legitimate anon REST caller exists.
REVOKE ALL ON FUNCTION public.get_invoice_by_token(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_invoice_by_token(TEXT) TO service_role;

-- ── 4. next_invoice_number() — revoke anon; keep authenticated ────
-- /api/invoices/route.ts calls this as the authenticated user via
-- supabase.rpc(). Migration 009 already fixed the function body to
-- use auth.uid() internally so authenticated callers can only affect
-- their own counter. Revoke only the unnecessary anon grant.
REVOKE EXECUTE ON FUNCTION public.next_invoice_number(UUID) FROM anon;

-- ── 5. rls_auto_enable() — revoke if present ─────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated';
  END IF;
END
$$;

-- ── 6. PROFILES UPDATE — grant columns added after migration 009 ──
-- Migration 009 locked authenticated UPDATE to an explicit column list.
-- Migrations 010–013 added new user-editable columns that were never
-- added to the GRANT, which would silently block profile PATCH calls
-- for theme, colours, and WhatsApp preference.
GRANT UPDATE (
  invoice_theme,
  brand_color_primary,
  brand_color_header,
  whatsapp_reminders_enabled
) ON public.profiles TO authenticated;
