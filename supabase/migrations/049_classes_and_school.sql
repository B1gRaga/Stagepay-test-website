-- Schools and larger tuition centres bill whole classes. A client (the parent)
-- can now carry the class they belong to and the learner they usually pay
-- for, so the Clients page can group by class and New Invoice can bill a
-- class in one go. Both optional; a salon never sees them.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS class_name TEXT
    CHECK (class_name IS NULL OR char_length(class_name) <= 40),
  ADD COLUMN IF NOT EXISTS billed_for TEXT
    CHECK (billed_for IS NULL OR char_length(billed_for) <= 100);

CREATE INDEX IF NOT EXISTS clients_user_class_idx
  ON public.clients (user_id, class_name)
  WHERE deleted_at IS NULL AND class_name IS NOT NULL;

-- "School" joins the business types (sign-up, onboarding, waitlist).
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_business_type_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_business_type_check
    CHECK (business_type IN ('tuition_centre','school','contractor','freelancer','salon','agency','other'));

ALTER TABLE public.waitlist_signups
  DROP CONSTRAINT IF EXISTS waitlist_signups_business_type_check;
ALTER TABLE public.waitlist_signups
  ADD CONSTRAINT waitlist_signups_business_type_check
    CHECK (business_type IN ('tuition_centre','school','contractor','freelancer','salon','agency','other'));
