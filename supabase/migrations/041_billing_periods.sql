-- Plans can be paid for 1, 6 or 12 months at a time (6 months 5% off, a year 10% off).
-- Checkout stores the chosen length next to pending_plan; confirming the payment
-- reads it to set the end date, then clears both.
-- Like pending_plan, only service_role writes it: the authenticated role's
-- UPDATE grant is a column list (migrations 009/033) that this column isn't on.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pending_months SMALLINT
    CHECK (pending_months IS NULL OR pending_months IN (1, 6, 12));
