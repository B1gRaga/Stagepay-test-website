-- Security audit 2026-11-11: the anon role (the public API key before anyone
-- signs in) still holds INSERT/UPDATE/DELETE/TRUNCATE grants on the business
-- tables from the project's early defaults. Row Level Security blocks every
-- row today because no policy names anon, but TRUNCATE is not subject to RLS
-- at all, and a future policy written "TO public" would open the table to the
-- internet. Nothing in the app reads or writes these tables as anon: the
-- public invoice page and the waitlist use the service role on the server.
--
-- authenticated keeps SELECT/INSERT/UPDATE/DELETE (RLS scopes the rows) and
-- loses TRUNCATE/REFERENCES/TRIGGER, which PostgREST never uses.
--
-- Check afterwards:
--   select grantee, table_name, string_agg(privilege_type, ',')
--   from information_schema.role_table_grants
--   where table_schema = 'public' and grantee in ('anon', 'authenticated')
--   group by 1, 2 order by 2, 1;
-- anon should not appear; authenticated should show only the four DML rights.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Tables made later should not get the old defaults back.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
