-- Dry run for migration 037. Paste the whole file into the SQL Editor and Run.
-- Expected: an error reading "DRY RUN OK: ..." (that error undoes everything).
BEGIN;

-- ── Migration 037 ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account uuid := public.current_account_id();
  v_role    text := public.current_account_role();
BEGIN
  IF auth.uid() IS NULL OR v_account IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only the owner or an admin can delete clients' USING ERRCODE = '42501';
  END IF;

  UPDATE public.clients
     SET deleted_at = now()
   WHERE id = p_client_id
     AND user_id = v_account
     AND deleted_at IS NULL;
  RETURN FOUND;
END
$$;

CREATE OR REPLACE FUNCTION public.restore_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account uuid := public.current_account_id();
  v_role    text := public.current_account_role();
BEGIN
  IF auth.uid() IS NULL OR v_account IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only the owner or an admin can restore clients' USING ERRCODE = '42501';
  END IF;

  UPDATE public.clients
     SET deleted_at = NULL
   WHERE id = p_client_id
     AND user_id = v_account
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - interval '1 day';
  RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION public.delete_client(uuid)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_client(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_client(uuid) TO authenticated;

-- ── Setup: owner A on Business with an admin B and a staff member C; D is an
--    outsider with their own business. A has two clients. ───────────────────
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 't-owner@test.invalid'),
  ('00000000-0000-4000-8000-0000000000b1', 't-admin@test.invalid'),
  ('00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid'),
  ('00000000-0000-4000-8000-0000000000d1', 't-other@test.invalid');
UPDATE public.profiles SET plan = 'business' WHERE id = '00000000-0000-4000-8000-0000000000a1';
INSERT INTO public.teams (id, owner_id, name) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'Test Tutors');
INSERT INTO public.team_members (team_id, user_id, email, status, role) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000b1', 't-admin@test.invalid', 'active', 'admin'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid', 'active', 'staff');
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000a1'
 WHERE id IN ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000c1');
INSERT INTO public.clients (id, user_id, name) VALUES
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-0000000000a1', 'Test client one'),
  ('00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-0000000000a1', 'Test client two');

-- ── The owner deletes, can't see it, can't delete it twice, then undoes ─────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.delete_client('00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 1: owner could not delete their client'; END IF;
  IF EXISTS (SELECT 1 FROM public.clients WHERE id = '00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 2: deleted client still shows'; END IF;
  IF public.delete_client('00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 3: a deleted client was deleted again'; END IF;
  IF NOT public.restore_client('00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 4: owner could not undo the delete'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = '00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 5: restored client does not show'; END IF;
END $$;

-- ── Staff in the business can't delete ─────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.delete_client('00000000-0000-4000-8000-00000000c002');
    RAISE EXCEPTION 'TEST 6: staff was allowed to delete a client';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ── An admin in the business can ───────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF NOT public.delete_client('00000000-0000-4000-8000-00000000c002') THEN RAISE EXCEPTION 'TEST 7: admin could not delete a client'; END IF;
END $$;

-- ── An outsider can't touch another business's clients ─────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.delete_client('00000000-0000-4000-8000-00000000c001') THEN RAISE EXCEPTION 'TEST 8: an outsider deleted another business''s client'; END IF;
  IF public.restore_client('00000000-0000-4000-8000-00000000c002') THEN RAISE EXCEPTION 'TEST 9: an outsider restored another business''s client'; END IF;
END $$;

-- ── Signed out: not allowed at all ─────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.delete_client('00000000-0000-4000-8000-00000000c001');
    RAISE EXCEPTION 'TEST 10: a signed-out visitor could delete a client';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- ── Undo only works for a day ──────────────────────────────────────────────
RESET ROLE;
UPDATE public.clients SET deleted_at = now() - interval '2 days' WHERE id = '00000000-0000-4000-8000-00000000c002';
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.restore_client('00000000-0000-4000-8000-00000000c002') THEN RAISE EXCEPTION 'TEST 11: a client deleted two days ago was restored'; END IF;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE EXCEPTION 'DRY RUN OK: all 11 checks passed; rolled back, nothing kept'; END $$;
