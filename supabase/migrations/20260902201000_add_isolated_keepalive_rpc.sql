/*
  # Isolated keepalive RPC

  This function gives the scheduled Netlify job one deliberately public,
  data-free database operation. It lives in its own exposed schema so the anon
  role does not need access to the application schema (`public`).
*/

CREATE SCHEMA IF NOT EXISTS linergy_keepalive;

REVOKE ALL PRIVILEGES ON SCHEMA linergy_keepalive
FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA linergy_keepalive TO anon;

CREATE OR REPLACE FUNCTION linergy_keepalive.ping()
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT true;
$$;

REVOKE ALL PRIVILEGES ON FUNCTION linergy_keepalive.ping()
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION linergy_keepalive.ping() TO anon;

COMMENT ON SCHEMA linergy_keepalive IS
  'Isolated API surface for the data-free scheduled keepalive.';

COMMENT ON FUNCTION linergy_keepalive.ping() IS
  'Minimal data-free RPC used by the scheduled Netlify keepalive.';

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA linergy_keepalive
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;
