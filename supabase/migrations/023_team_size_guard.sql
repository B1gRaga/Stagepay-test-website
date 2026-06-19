-- ================================================================
-- Migration 023: Close the team-size race condition
--
-- app/api/team/invite/route.ts does a SELECT COUNT then an upsert with
-- no lock between them — two concurrent invites can both pass the count
-- check and push a team past MAX_TEAM_SIZE (5, including owner). This
-- trigger is the authoritative backstop; the app-level check stays as-is
-- for a fast, friendly error on the common (non-racing) path.
-- ================================================================

CREATE OR REPLACE FUNCTION public.enforce_team_size()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count INT;
BEGIN
  -- Lock the team row so concurrent inserts for the same team serialize
  -- instead of both reading a stale count.
  PERFORM 1 FROM public.teams WHERE id = NEW.team_id FOR UPDATE;

  SELECT COUNT(*) INTO member_count
  FROM public.team_members
  WHERE team_id = NEW.team_id AND status IN ('pending', 'active');

  -- +1 for the owner, who isn't a row in team_members
  IF member_count + 1 >= 5 THEN
    RAISE EXCEPTION 'Team is full (max 5 members including owner)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_members_size_guard ON public.team_members;
CREATE TRIGGER team_members_size_guard
  BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_team_size();
