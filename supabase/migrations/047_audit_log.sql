-- ================================================================
-- Migration 047: Audit log
--
-- Records every change (insert, update, delete) to the business tables, so
-- that after a break-in we can see what was changed, by whom and when, and
-- put back what was altered or removed.
--
-- It is written by database triggers, so it catches every path: the app, the
-- crons, a stolen sign-in token used straight against the Supabase API, and
-- the service-role key.
--
-- What each row holds:
--   INSERT  ids only (the row itself is in its table)
--   UPDATE  old and new values of the columns that changed
--   DELETE  the whole row as it was, so it can be restored
--
-- Nobody can read it through the API except the service role, and no API
-- role, service role included, can change or delete its rows.
-- Rows are removed after 180 days (pg_cron job at the end).
--
-- Reads are NOT recorded: Postgres has no trigger for SELECT.
--
-- SAFE TO RE-RUN.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  table_name  TEXT        NOT NULL,
  action      TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  row_id      TEXT,
  -- The business the row belongs to (the account owner's user id).
  account_id  UUID,
  -- The signed-in user who made the change. NULL means it was not a signed-in
  -- user: server code using the service role, a cron, or the SQL editor.
  actor_id    UUID,
  -- 'authenticated', 'anon', 'service_role', or the database user (SQL editor).
  actor_role  TEXT,
  old_data    JSONB,
  new_data    JSONB
);

CREATE INDEX IF NOT EXISTS audit_log_at_idx      ON public.audit_log (at);
CREATE INDEX IF NOT EXISTS audit_log_account_idx ON public.audit_log (account_id, at);
CREATE INDEX IF NOT EXISTS audit_log_row_idx     ON public.audit_log (table_name, row_id);

-- RLS on with no policies: anon and authenticated can never see a row.
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.audit_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.audit_log TO service_role;

-- ── Trigger function ─────────────────────────────────────────────
-- Any failure in here is turned into a warning. The audit log must never be
-- the reason an invoice fails to save.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old     JSONB;
  v_new     JSONB;
  v_row     JSONB;
  v_old_out JSONB;
  v_new_out JSONB;
  v_account UUID;
BEGIN
  BEGIN
    IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
    IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;
    v_row := coalesce(v_new, v_old);

    IF TG_OP = 'UPDATE' THEN
      -- Keep only the columns whose value changed; updated_at alone is not a change.
      SELECT jsonb_object_agg(o.key, o.value), jsonb_object_agg(o.key, v_new -> o.key)
        INTO v_old_out, v_new_out
        FROM jsonb_each(v_old) AS o
       WHERE o.key <> 'updated_at'
         AND o.value IS DISTINCT FROM v_new -> o.key;
      IF v_old_out IS NULL THEN
        RETURN NULL;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      v_old_out := v_old;
    END IF;

    IF TG_TABLE_NAME = 'profiles' THEN
      v_account := (v_row ->> 'id')::uuid;
    ELSIF TG_TABLE_NAME = 'teams' THEN
      v_account := (v_row ->> 'owner_id')::uuid;
    ELSIF TG_TABLE_NAME = 'team_members' THEN
      SELECT t.owner_id INTO v_account
        FROM public.teams t
       WHERE t.id = (v_row ->> 'team_id')::uuid;
    ELSE
      v_account := (v_row ->> 'user_id')::uuid;
    END IF;

    INSERT INTO public.audit_log
      (table_name, action, row_id, account_id, actor_id, actor_role, old_data, new_data)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      v_row ->> 'id',
      v_account,
      nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid,
      coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', session_user::text),
      v_old_out,
      v_new_out
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'audit_row_change failed on %: %', TG_TABLE_NAME, SQLERRM;
  END;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_row_change() FROM PUBLIC, anon, authenticated;

-- ── Attach to every business table that exists ───────────────────
-- invoice_counters (a running number) and waitlist_signups are left out.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'clients', 'invoices', 'invoice_items', 'invoice_payments',
    'reminders', 'teams', 'team_members', 'expenses'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
      EXECUTE format(
        'CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
    END IF;
  END LOOP;
END;
$$;

-- ── Retention: drop rows older than 180 days ─────────────────────
-- Runs inside the database (pg_cron) as its owner, so no API role needs
-- DELETE on the table. If pg_cron can't be enabled the log simply isn't
-- trimmed, which only costs disk space.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'prune-audit-log';
  PERFORM cron.schedule(
    'prune-audit-log',
    '30 2 * * 0',
    $job$DELETE FROM public.audit_log WHERE at < now() - interval '180 days'$job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available, audit_log is not trimmed automatically: %', SQLERRM;
END;
$$;
