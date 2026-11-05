-- ================================================================
-- Migration 045: free plan gets 3 invoices a month, and the first 100
-- people on the waitlist get their promised month of Pro.
--
-- 1. account_can_add_invoice(): the free allowance goes from 2 to 3 a month
--    (matches FREE_MONTHLY_LIMIT in lib/plans.ts).
-- 2. handle_new_user(): a new account whose email matches one of the first
--    100 waitlist sign-ups (by join order, ignoring case) starts on Pro for
--    30 days. The first-100-accounts rule from migration 026 stays as well.
--    Sign-up emails are confirmed before the account is usable, so only the
--    owner of a waitlisted email can claim its month.
-- 3. join_waitlist(): left over from the first waitlist. It still writes the
--    dropped student_range column, could be called without signing in, and
--    /api/waitlist doesn't use it.
-- ================================================================

CREATE OR REPLACE FUNCTION public.account_can_add_invoice()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT plan FROM profiles WHERE id = public.current_account_id()), 'free') IN ('pro', 'business')
      OR (SELECT count(*) FROM invoices
           WHERE user_id = public.current_account_id()
             AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') < 3
$$;
REVOKE ALL ON FUNCTION public.account_can_add_invoice() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_can_add_invoice() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_count INT;
  v_waitlisted BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_existing_count FROM public.profiles;

  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT email FROM public.waitlist_signups ORDER BY created_at, id LIMIT 100
    ) first_100
    WHERE lower(first_100.email) = lower(NEW.email)
  ) INTO v_waitlisted;

  IF v_existing_count < 100 OR v_waitlisted THEN
    INSERT INTO public.profiles (id, email, name, business_type, plan, subscription_expires_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      NULLIF(NEW.raw_user_meta_data->>'business_type', ''),
      'pro',
      NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (id, email, name, business_type)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
      NULLIF(NEW.raw_user_meta_data->>'business_type', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.join_waitlist(text, text, text, text, text, text, boolean, text);

-- The waitlist match looks emails up without regard to case.
CREATE INDEX IF NOT EXISTS waitlist_signups_email_lower_idx
  ON public.waitlist_signups (lower(email)) WHERE email IS NOT NULL;
