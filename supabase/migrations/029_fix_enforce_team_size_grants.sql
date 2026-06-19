-- ================================================================
-- Migration 029: Actually close enforce_team_size() to anon/authenticated
--
-- Migration 028 did REVOKE EXECUTE ... FROM anon/authenticated, which
-- has no effect: the function's EXECUTE privilege was never granted to
-- those roles individually — it came from the default PUBLIC grant
-- Postgres applies on CREATE FUNCTION. Revoking a role's own grant
-- doesn't remove access it has via PUBLIC. Migration 015 hit this same
-- bug for handle_new_user() and fixed it by revoking PUBLIC first; same
-- fix here.
-- ================================================================

REVOKE ALL ON FUNCTION public.enforce_team_size() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_team_size() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_team_size() FROM authenticated;
