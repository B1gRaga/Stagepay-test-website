-- Shared team accounts, step 1: the database.
--
-- Data keeps belonging to an account through user_id. A person's own account
-- is their own id; a team's account is its owner's id. Each person picks the
-- account they are working in (profiles.current_account_id), and every access
-- rule checks rows against public.current_account_id(), which only honours
-- that pick while the person is an active member of that team.
-- For anyone not in a team, current_account_id() = auth.uid(), so their
-- access is exactly what it was.
-- Depends on 033 (column-level UPDATE grants on profiles).

-- ── Columns ────────────────────────────────────────────────────────────────
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'staff'
    CONSTRAINT team_members_role_check CHECK (role IN ('admin', 'staff'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_account_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
GRANT UPDATE (current_account_id) ON public.profiles TO authenticated;

-- Who created each row; set automatically for signed-in requests.
ALTER TABLE public.invoices  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.clients   ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.expenses  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;

-- Existing rows were all created by their account's owner.
UPDATE public.invoices  SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.clients   SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.reminders SET created_by = user_id WHERE created_by IS NULL;
UPDATE public.expenses  SET created_by = user_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS team_members_user_active_idx ON public.team_members (user_id) WHERE status = 'active';

-- ── Which account, and which role ──────────────────────────────────────────
-- The account the signed-in person is working in: the one they picked if they
-- are an active member of its team, otherwise their own.
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
             AND tm.status = 'active')),
    auth.uid())
$$;

-- 'owner' in their own account, otherwise their role in the team they picked.
CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN public.current_account_id() = auth.uid() THEN 'owner'
    ELSE (SELECT tm.role FROM team_members tm JOIN teams t ON t.id = tm.team_id
           WHERE t.owner_id = public.current_account_id()
             AND tm.user_id = auth.uid()
             AND tm.status = 'active'
           LIMIT 1)
  END
$$;

REVOKE ALL ON FUNCTION public.current_account_id()   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_account_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_account_id()   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_account_role() TO authenticated, service_role;

-- ── Access rules: "rows of my account" instead of "my rows" ────────────────
-- (SELECT …) lets Postgres work the account out once per query, not per row.

-- invoices: the free-plan limit. 001's enforce_plan_invoice_limit never limited
-- anything: it was a permissive rule, so the "owner full access" rule beside it
-- always let inserts through anyway, and it said 5 where the app enforces 2. It
-- also counted invoices from inside a rule on invoices, which Postgres rejects
-- as infinite recursion once the invoices rules contain lookups (as they now do).
-- Its replacement must ALSO pass (restrictive), counts through a function, and
-- uses the app's limit and the account's plan.
CREATE OR REPLACE FUNCTION public.account_can_add_invoice()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT plan FROM profiles WHERE id = public.current_account_id()), 'free') IN ('pro', 'business')
      OR (SELECT count(*) FROM invoices
           WHERE user_id = public.current_account_id()
             AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') < 2
$$;
REVOKE ALL ON FUNCTION public.account_can_add_invoice() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_can_add_invoice() TO authenticated;

DROP POLICY IF EXISTS "enforce_plan_invoice_limit" ON public.invoices;
CREATE POLICY "invoices: free plan monthly limit" ON public.invoices AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.account_can_add_invoice()));

-- invoices: everyone in the account works on them; only Owner and Admin delete.
DROP POLICY IF EXISTS "invoices: owner full access" ON public.invoices;
CREATE POLICY "invoices: account read"   ON public.invoices FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_account_id()));
CREATE POLICY "invoices: account insert" ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT public.current_account_id()));
CREATE POLICY "invoices: account update" ON public.invoices FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));
CREATE POLICY "invoices: owner or admin delete" ON public.invoices FOR DELETE TO authenticated
  USING (user_id = (SELECT public.current_account_id())
         AND (SELECT public.current_account_role()) IN ('owner', 'admin'));

-- invoice_items: edited along with their invoice by anyone in the account.
DROP POLICY IF EXISTS "invoice_items: owner full access" ON public.invoice_items;
CREATE POLICY "invoice_items: account access" ON public.invoice_items FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));

-- clients: same shape as before (soft delete, no DELETE rule), per account.
DROP POLICY IF EXISTS "clients: owner insert"           ON public.clients;
DROP POLICY IF EXISTS "clients: owner read non-deleted" ON public.clients;
DROP POLICY IF EXISTS "clients: owner update"           ON public.clients;
CREATE POLICY "clients: account insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT public.current_account_id()));
CREATE POLICY "clients: account read non-deleted" ON public.clients FOR SELECT TO authenticated
  USING (user_id = (SELECT public.current_account_id()) AND deleted_at IS NULL);
CREATE POLICY "clients: account update" ON public.clients FOR UPDATE TO authenticated
  USING (user_id = (SELECT public.current_account_id()) AND deleted_at IS NULL)
  WITH CHECK (user_id = (SELECT public.current_account_id()));

-- reminders, expenses, invoice counters: per account.
DROP POLICY IF EXISTS "reminders: owner full access" ON public.reminders;
CREATE POLICY "reminders: account access" ON public.reminders FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));

DROP POLICY IF EXISTS "own expenses" ON public.expenses;
CREATE POLICY "expenses: account access" ON public.expenses FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));

DROP POLICY IF EXISTS "invoice_counters: owner access" ON public.invoice_counters;
CREATE POLICY "invoice_counters: account access" ON public.invoice_counters FOR ALL TO authenticated
  USING (user_id = (SELECT public.current_account_id()))
  WITH CHECK (user_id = (SELECT public.current_account_id()));

-- ── Team rules without loops ───────────────────────────────────────────────
-- The rules from 022 checked each other in a circle: team_members_owner_all
-- read teams, whose teams_member_read read team_members, and so on, so any
-- read of team_members failed with "infinite recursion". It never showed
-- because no team existed. The lookups now go through two functions that read
-- without re-applying the rules, which breaks the circle.
CREATE OR REPLACE FUNCTION public.my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.my_owned_team_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teams WHERE owner_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.my_team_ids()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_owned_team_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_team_ids()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_owned_team_ids() TO authenticated;

-- Owners manage the people on their own team.
DROP POLICY IF EXISTS "team_members_owner_all" ON public.team_members;
CREATE POLICY "team_members_owner_all" ON public.team_members FOR ALL TO authenticated
  USING (team_id IN (SELECT public.my_owned_team_ids()))
  WITH CHECK (team_id IN (SELECT public.my_owned_team_ids()));

-- Members see the other people on their team (names on "Created by", the team list).
CREATE POLICY "team_members: same team read" ON public.team_members FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.my_team_ids()));

-- Members see the team itself (its name, for the business switcher).
DROP POLICY IF EXISTS "teams_member_read" ON public.teams;
CREATE POLICY "teams_member_read" ON public.teams FOR SELECT TO authenticated
  USING (id IN (SELECT public.my_team_ids()));
