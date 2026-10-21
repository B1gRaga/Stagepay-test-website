-- Dry run for migration 035. Paste the whole file into the SQL Editor and Run.
-- Expected: an error reading "DRY RUN OK: …" (that error undoes everything).
BEGIN;

-- ── Migration 035 ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_account_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.current_account_id
       FROM profiles p
      WHERE p.id = auth.uid()
        AND p.current_account_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM team_members tm JOIN teams t ON t.id = tm.team_id
           WHERE t.owner_id = p.current_account_id
             AND tm.user_id = auth.uid()
             AND tm.status = 'active')
        AND EXISTS (
          SELECT 1 FROM profiles o
           WHERE o.id = p.current_account_id
             AND o.plan = 'business')),
    auth.uid())
$$;

-- ── Setup: owner A on Business, staff M switched into A's business ─────────
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 't-owner@test.invalid'),
  ('00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid');
UPDATE public.profiles SET plan = 'business' WHERE id = '00000000-0000-4000-8000-0000000000a1';
INSERT INTO public.teams (id, owner_id, name) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000a1', 'Test Tutors');
INSERT INTO public.team_members (team_id, user_id, email, status, role) VALUES
  ('00000000-0000-4000-8000-0000000000f1', '00000000-0000-4000-8000-0000000000c1', 't-staff@test.invalid', 'active', 'staff');
INSERT INTO public.invoices (user_id, invoice_number, client_name) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'T-A-1', 'Owner client'),
  ('00000000-0000-4000-8000-0000000000c1', 'T-M-1', 'Staff private client');
UPDATE public.profiles SET current_account_id = '00000000-0000-4000-8000-0000000000a1' WHERE id = '00000000-0000-4000-8000-0000000000c1';

-- ── While the owner is on Business, the staff member works in it ───────────
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_id() <> '00000000-0000-4000-8000-0000000000a1' THEN RAISE EXCEPTION 'TEST 1: staff not in the team business while owner is on Business'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'T-A-1') THEN RAISE EXCEPTION 'TEST 2: staff cannot see team invoices'; END IF;
END $$;

-- ── The owner's plan ends ──────────────────────────────────────────────────
RESET ROLE;
UPDATE public.profiles SET plan = 'free' WHERE id = '00000000-0000-4000-8000-0000000000a1';
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_id() <> auth.uid() THEN RAISE EXCEPTION 'TEST 3: staff still in the team business after the owner''s plan ended'; END IF;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'T-A-1') THEN RAISE EXCEPTION 'TEST 4: staff still sees team invoices after the plan ended'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE invoice_number = 'T-M-1') THEN RAISE EXCEPTION 'TEST 5: staff lost access to their own business'; END IF;
END $$;

-- ── The owner renews ───────────────────────────────────────────────────────
RESET ROLE;
UPDATE public.profiles SET plan = 'business' WHERE id = '00000000-0000-4000-8000-0000000000a1';
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000c1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_id() <> '00000000-0000-4000-8000-0000000000a1' THEN RAISE EXCEPTION 'TEST 6: staff not back in the team business after renewal'; END IF;
END $$;

-- ── The owner is unaffected throughout ─────────────────────────────────────
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF public.current_account_id() <> auth.uid() THEN RAISE EXCEPTION 'TEST 7: owner not in their own business'; END IF;
END $$;

RESET ROLE;
DO $$ BEGIN RAISE EXCEPTION 'DRY RUN OK: all 7 checks passed; rolled back, nothing kept'; END $$;
