-- 051: VAT only with a VAT number, and invoices fixed once they go out.
--
-- 1. VAT is off by default. Only a business with a VAT number on its profile
--    can put VAT on an invoice (charging VAT unregistered is an offence).
-- 2. Once an invoice is no longer a draft, what it says (who, what, amounts,
--    dates, VAT) can't be changed and it can't be deleted; it can be
--    cancelled, and a corrected copy issued. Its line items are fixed too.
--
-- These rules apply to people using the app (roles authenticated/anon). Our
-- own server jobs (service role) and account deletion are not blocked, so the
-- recurring-invoice job and "delete my account" keep working.

ALTER TABLE public.profiles ALTER COLUMN default_vat_rate SET DEFAULT 0;
ALTER TABLE public.invoices ALTER COLUMN vat_rate SET DEFAULT 0;

UPDATE public.profiles
   SET default_vat_rate = 0
 WHERE default_vat_rate > 0
   AND coalesce(btrim(vat_number), '') = '';

-- Reads the owner's profile regardless of who is asking (a team member can't
-- read the owner's profile row directly). Returns only a yes/no.
CREATE OR REPLACE FUNCTION public.owner_has_vat_number(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(btrim(vat_number), '') <> '' FROM public.profiles WHERE id = p_user_id
$$;
REVOKE ALL ON FUNCTION public.owner_has_vat_number(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_has_vat_number(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.invoices_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN coalesce(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'A sent invoice stays on record. Cancel it instead.' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.vat_rate > 0
     AND (TG_OP = 'INSERT' OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate)
     AND NOT coalesce(public.owner_has_vat_number(NEW.user_id), false) THEN
    RAISE EXCEPTION 'VAT needs a VAT number on the profile.' USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> 'draft' AND (
       NEW.user_id         IS DISTINCT FROM OLD.user_id
    OR NEW.invoice_number  IS DISTINCT FROM OLD.invoice_number
    OR NEW.client_name     IS DISTINCT FROM OLD.client_name
    OR NEW.client_address  IS DISTINCT FROM OLD.client_address
    OR NEW.client_vat      IS DISTINCT FROM OLD.client_vat
    OR NEW.project         IS DISTINCT FROM OLD.project
    OR NEW.billed_for      IS DISTINCT FROM OLD.billed_for
    OR NEW.notes           IS DISTINCT FROM OLD.notes
    OR NEW.issue_date      IS DISTINCT FROM OLD.issue_date
    OR NEW.currency        IS DISTINCT FROM OLD.currency
    OR NEW.subtotal        IS DISTINCT FROM OLD.subtotal
    OR NEW.vat_rate        IS DISTINCT FROM OLD.vat_rate
    OR NEW.vat_amount      IS DISTINCT FROM OLD.vat_amount
    OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.deposit_amount  IS DISTINCT FROM OLD.deposit_amount
    OR NEW.total           IS DISTINCT FROM OLD.total
  ) THEN
    RAISE EXCEPTION 'This invoice has gone out and can''t be changed. Cancel it and issue a corrected copy.' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS invoices_guard ON public.invoices;
CREATE TRIGGER invoices_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_guard();

CREATE OR REPLACE FUNCTION public.invoice_items_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN coalesce(NEW, OLD);
  END IF;
  SELECT status INTO v_status FROM public.invoices WHERE id = coalesce(NEW.invoice_id, OLD.invoice_id);
  -- No parent row (it is being deleted along with its items): nothing to protect.
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'This invoice has gone out and its items can''t be changed.' USING ERRCODE = 'check_violation';
  END IF;
  RETURN coalesce(NEW, OLD);
END
$$;

DROP TRIGGER IF EXISTS invoice_items_guard ON public.invoice_items;
CREATE TRIGGER invoice_items_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.invoice_items_guard();
