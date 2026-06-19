-- ================================================================
-- Migration 028: Revoke public REST access to enforce_team_size()
--
-- Flagged by Supabase's database linter: enforce_team_size() (migration
-- 023) is a SECURITY DEFINER trigger function, but Postgres grants
-- EXECUTE to PUBLIC by default on function creation — which PostgREST
-- exposes as a callable RPC endpoint to both anon and authenticated
-- (/rest/v1/rpc/enforce_team_size). It's a trigger-only function (fires
-- via BEFORE INSERT ON team_members regardless of these grants, since
-- trigger firing doesn't require EXECUTE on the invoking role) with no
-- legitimate direct caller — same fix already applied to
-- handle_new_user() in migration 014.
-- ================================================================

REVOKE EXECUTE ON FUNCTION public.enforce_team_size() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_team_size() FROM authenticated;
