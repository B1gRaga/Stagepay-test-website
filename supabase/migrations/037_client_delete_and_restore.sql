-- Deleting a client failed for everyone: the clients update rule only lets you
-- change rows that aren't deleted, and the read rule hides deleted rows, so
-- Postgres rejects an update that marks a row deleted ("new row violates
-- row-level security policy").
--
-- Two small functions do the job instead, with the same checks the app makes:
-- signed in, the client belongs to the business you're working in, and you
-- are its owner or an admin (staff can't delete). Deleted clients keep their
-- invoices (those store the client's details themselves) and are removed for
-- good by the weekly archive job after 90 days. Restore is the "Undo" right
-- after deleting, so it only works for a day.

CREATE OR REPLACE FUNCTION public.delete_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account uuid := public.current_account_id();
  v_role    text := public.current_account_role();
BEGIN
  IF auth.uid() IS NULL OR v_account IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only the owner or an admin can delete clients' USING ERRCODE = '42501';
  END IF;

  UPDATE public.clients
     SET deleted_at = now()
   WHERE id = p_client_id
     AND user_id = v_account
     AND deleted_at IS NULL;
  RETURN FOUND;
END
$$;

CREATE OR REPLACE FUNCTION public.restore_client(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account uuid := public.current_account_id();
  v_role    text := public.current_account_role();
BEGIN
  IF auth.uid() IS NULL OR v_account IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only the owner or an admin can restore clients' USING ERRCODE = '42501';
  END IF;

  UPDATE public.clients
     SET deleted_at = NULL
   WHERE id = p_client_id
     AND user_id = v_account
     AND deleted_at IS NOT NULL
     AND deleted_at > now() - interval '1 day';
  RETURN FOUND;
END
$$;

REVOKE ALL ON FUNCTION public.delete_client(uuid)  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_client(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_client(uuid) TO authenticated;
