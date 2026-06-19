-- ================================================================
-- Migration 026: First 100 signups get free Pro for their first month
--
-- Migration 012 made every new signup default to 'pro' with no expiry
-- ("for real-world testing"). That's reverted here: new signups default
-- to 'free' again, and handle_new_user() grants 'pro' with a 30-day
-- expiry only to the first 100 signups (counted at insert time, before
-- the new row is added — so existing-count 0..99 are signups #1..#100).
-- Signup #101 onward gets 'free' and has to pay to go pro/business.
--
-- Existing accounts still on the unconditional 'pro' default from
-- migration 012 are folded into the promo with a fresh 30-day clock
-- starting now. Accounts already moved off 'pro' (e.g. upgraded to
-- business) are untouched, since the backfill only matches plan='pro'.
--
-- Known limitation: the existing-count check has a small race window
-- under concurrent signups right at the 100-user boundary (could grant
-- a couple extra Pro trials). Not worth a locking scheme for a
-- promo cutoff — if it matters later, add a `SELECT ... FOR UPDATE` on
-- a counter row the way migration 023 does for team size.
-- ================================================================

ALTER TABLE public.profiles
  ALTER COLUMN plan SET DEFAULT 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing_count INT;
BEGIN
  SELECT COUNT(*) INTO v_existing_count FROM public.profiles;

  IF v_existing_count < 100 THEN
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

-- Fold existing accounts still on the unconditional testing 'pro' default
-- into the promo with a fresh 30-day clock.
UPDATE public.profiles
SET subscription_expires_at = NOW() + INTERVAL '30 days'
WHERE plan = 'pro' AND subscription_expires_at IS NULL;
