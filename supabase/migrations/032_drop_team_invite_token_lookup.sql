-- team_members_token_lookup let anyone holding the public anon key list every
-- pending invite, with its email and invite token, and use a token to join a
-- team. Nothing in the app reads invites this way: /api/team/accept looks the
-- token up with the service role. Owners still see their own invites through
-- team_members_owner_all, and members their own row through team_members_self_read.
DROP POLICY IF EXISTS "team_members_token_lookup" ON public.team_members;
