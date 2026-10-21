-- Access tests for migrations 033 and 034. Run AFTER both, inside a transaction
-- that is rolled back:   BEGIN; <033>; <034>; <this file>; ROLLBACK;
-- Any failed check stops with "TEST n: …". Reaching the last line means all passed.
--
-- People: A owns a team; M (staff) and N (admin) are active members of it;
-- P was invited but hasn't joined; B is an outsider with their own business.

-- ── Setup (as the database owner) ───────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 't-owner@test.invalid'),
  ('00000000-0000-4000-8000-0000000000b1', 't-outsider@test.invalid'),
  ('00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid'),
  ('00000000-0000-4000-8000-0000000000d1', 't-admin@test.invalid'),
  ('00000000-0000-4000-8000-0000000000e1', 't-pending@test.invalid');

INSERT INTO public.teams (id, owner_id, name) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'Test Tutors');
INSERT INTO public.team_members (team_id, user_id, email, status, role) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid',   'active',  'staff'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000d1', 't-admin@test.invalid',   'active',  'admin'),
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000e1', 't-pending@test.invalid', 'pending', 'staff');

INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'T-A-1', 'Owner client'),
  ('00000000-0000-4000-8000-0000000000a1', 'T-A-2', 'Owner client'),
  ('00000000-0000-4000-8000-0000000000b1', 'T-B-1', 'Outsider client'),
  ('00000000-0000-4000-8000-0000000000c1', 'T-M-1', 'Staff private client');
-- B is on the Free plan (new test accounts start on Pro).
UPDATE public.profiles SET plan = 'free', subscription_expires_at = NULL WHERE id = '00000000-0000-4000-8000-0000000000b1';

INSERT INTO public.clients (user_id, name) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'Owner client'),
  ('00000000-0000-4000-8000-0000000000b1', 'Outsider client');

-- ── Owner A ─────────────────────────────────────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_role() <> 'owner' THEN RAISE EXCEPTION 'TEST 1: owner role is %', public.current_account_role(); END IF;
  IF (SELECT count(*) FROM public.invoices) <> 2 THEN RAISE EXCEPTION 'TEST 2: owner sees % invoices, expected 2', (SELECT count(*) FROM public.invoices); END IF;
  IF (SELECT count(*) FROM public.clients) <> 1 THEN RAISE EXCEPTION 'TEST 3: owner sees % clients, expected 1', (SELECT count(*) FROM public.clients); END IF;
  IF (SELECT count(*) FROM public.team_members) <> 3 THEN RAISE EXCEPTION 'TEST 4: owner sees % team rows, expected 3', (SELECT count(*) FROM public.team_members); END IF;
END $$;

-- Profile lock (033): own plan can't be changed, a business field can.
DO $$ BEGIN
  BEGIN
    UPDATE public.profiles SET plan = 'business' WHERE id = auth.uid();
    RAISE EXCEPTION 'TEST 5: owner could change their own plan';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.profiles WHERE id = auth.uid();
    RAISE EXCEPTION 'TEST 6: owner could delete their own profile';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.profiles SET firm_name = 'Test Tutors' WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST 7: owner could not update firm_name'; END IF;
END $$;

-- ── Staff M, in their own business (no switch) ──────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_id() <> auth.uid() THEN RAISE EXCEPTION 'TEST 8: unswitched staff account is not their own'; END IF;
  IF (SELECT count(*) FROM public.invoices) <> 1 THEN RAISE EXCEPTION 'TEST 9: unswitched staff sees % invoices, expected their own 1', (SELECT count(*) FROM public.invoices); END IF;
  IF (SELECT count(*) FROM public.team_members) <> 3 THEN RAISE EXCEPTION 'TEST 10: staff sees % team rows, expected 3', (SELECT count(*) FROM public.team_members); END IF;
  IF (SELECT count(*) FROM public.teams) <> 1 THEN RAISE EXCEPTION 'TEST 32: staff sees % teams, expected their 1', (SELECT count(*) FROM public.teams); END IF;
END $$;

-- ── Staff M, switched to the team (A's account) ─────────────────────────────
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000a1' WHERE id = auth.uid();
DO $$ BEGIN
  IF public.current_account_id() <> '00000000-0000-4000-8000-0000000000a1' THEN RAISE EXCEPTION 'TEST 11: switch to team not honoured'; END IF;
  IF public.current_account_role() <> 'staff' THEN RAISE EXCEPTION 'TEST 12: staff role is %', public.current_account_role(); END IF;
  IF (SELECT count(*) FROM public.invoices) <> 2 THEN RAISE EXCEPTION 'TEST 13: switched staff sees % invoices, expected the team''s 2', (SELECT count(*) FROM public.invoices); END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number IN ('T-B-1', 'T-M-1')) THEN RAISE EXCEPTION 'TEST 14: switched staff sees outsider or own-business invoices'; END IF;
  IF (SELECT count(*) FROM public.clients) <> 1 THEN RAISE EXCEPTION 'TEST 15: switched staff sees % clients, expected 1', (SELECT count(*) FROM public.clients); END IF;
END $$;
INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES ('00000000-0000-4000-8000-0000000000a1', 'T-A-3', 'New by staff');
DO $$ BEGIN
  IF (SELECT created_by FROM public.invoices WHERE invoice_number = 'T-A-3') <> auth.uid() THEN RAISE EXCEPTION 'TEST 16: created_by not set to the staff member'; END IF;
  BEGIN
    INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES ('00000000-0000-4000-8000-0000000000b1', 'T-X', 'Into outsider');
    RAISE EXCEPTION 'TEST 17: staff could write into an outsider''s account';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.invoices SET status = 'paid' WHERE invoice_number = 'T-A-1';
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST 18: staff could not mark a team invoice paid'; END IF;
  DELETE FROM public.invoices WHERE invoice_number = 'T-A-2';
  IF FOUND THEN RAISE EXCEPTION 'TEST 19: staff could delete a team invoice'; END IF;
  BEGIN
    UPDATE public.team_members SET role = 'admin' WHERE user_id = auth.uid();
    IF FOUND THEN RAISE EXCEPTION 'TEST 20: staff could promote themselves'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Switching to a business they don't belong to falls back to their own.
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000b1' WHERE id = auth.uid();
DO $$ BEGIN
  IF public.current_account_id() <> auth.uid() THEN RAISE EXCEPTION 'TEST 21: switch to a non-member business was honoured'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number LIKE 'T-B-%') THEN RAISE EXCEPTION 'TEST 22: staff sees the outsider''s invoices'; END IF;
END $$;

-- ── Admin N, switched to the team ───────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000a1' WHERE id = auth.uid();
DO $$ BEGIN
  IF public.current_account_role() <> 'admin' THEN RAISE EXCEPTION 'TEST 23: admin role is %', public.current_account_role(); END IF;
  DELETE FROM public.invoices WHERE invoice_number = 'T-A-2';
  IF NOT FOUND THEN RAISE EXCEPTION 'TEST 24: admin could not delete a team invoice'; END IF;
END $$;

-- ── Pending P, trying to switch in before joining ───────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000a1' WHERE id = auth.uid();
DO $$ BEGIN
  IF public.current_account_id() <> auth.uid() THEN RAISE EXCEPTION 'TEST 25: pending invitee got into the team'; END IF;
  IF (SELECT count(*) FROM public.invoices) <> 0 THEN RAISE EXCEPTION 'TEST 26: pending invitee sees % invoices', (SELECT count(*) FROM public.invoices); END IF;
END $$;

-- ── Outsider B ──────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.invoices) <> 1 THEN RAISE EXCEPTION 'TEST 27: outsider sees % invoices, expected their own 1', (SELECT count(*) FROM public.invoices); END IF;
  IF (SELECT count(*) FROM public.team_members) <> 0 THEN RAISE EXCEPTION 'TEST 28: outsider sees % team rows', (SELECT count(*) FROM public.team_members); END IF;
  IF (SELECT count(*) FROM public.clients) <> 1 THEN RAISE EXCEPTION 'TEST 29: outsider sees % clients', (SELECT count(*) FROM public.clients); END IF;
  IF (SELECT count(*) FROM public.teams) <> 0 THEN RAISE EXCEPTION 'TEST 33: outsider sees % teams', (SELECT count(*) FROM public.teams); END IF;
END $$;

-- Free plan: 2 invoices a month. B already has 1 this month.
INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES ('00000000-0000-4000-8000-0000000000b1', 'T-B-2', 'Second this month');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES ('00000000-0000-4000-8000-0000000000b1', 'T-B-3', 'Third this month');
    RAISE EXCEPTION 'TEST 34: free plan could create a 3rd invoice this month';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF (SELECT count(*) FROM public.invoices) <> 2 THEN RAISE EXCEPTION 'TEST 35: free account has % invoices, expected 2', (SELECT count(*) FROM public.invoices); END IF;
END $$;

-- ── Signed out ──────────────────────────────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{}', true);
SET LOCAL ROLE anon;
-- Either they see no rows, or they aren't allowed to read the table at all.
DO $$ BEGIN
  BEGIN
    IF (SELECT count(*) FROM public.invoices) <> 0 THEN RAISE EXCEPTION 'TEST 30: signed-out visitor sees invoices'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    IF (SELECT count(*) FROM public.team_members) <> 0 THEN RAISE EXCEPTION 'TEST 31: signed-out visitor sees team rows'; END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
SELECT 'ALL 35 CHECKS PASSED' AS result;
