-- Shared team accounts: a team works in its owner's business only while that
-- business is on the Business plan. When the plan ends (the subscription-expiry
-- cron sets plan = 'free'), members fall back to their own business; switching
-- back works again once the owner renews. Their membership is kept.
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
