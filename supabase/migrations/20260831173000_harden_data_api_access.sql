/*
  # Harden Data API access

  Security model enforced by this migration:
  - Signed-out clients have no access to application tables or RPCs.
  - Authenticated users can read operational data and their own profile.
  - Only authenticated administrators can change operational data.
  - service_role keeps server-side access and must never be exposed to clients.
  - Application functions are opt-in instead of executable by PUBLIC by default.

  This migration intentionally does not change Supabase Auth provider settings.
  Production sign-up, email confirmation, CAPTCHA, and redirect URLs are managed
  separately in the Supabase Dashboard.
*/

-- -----------------------------------------------------------------------------
-- Centralized role check used by RLS and privileged RPCs.
-- SECURITY DEFINER avoids recursive RLS checks on public.profiles.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'::public.user_role
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true when the authenticated caller has an admin profile.';

-- -----------------------------------------------------------------------------
-- Fix the user-deletion RPC. The previous `caller_role != admin` comparison
-- allowed a NULL role to pass the check because SQL NULL comparisons are unknown.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users'
      USING ERRCODE = '42501';
  END IF;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null'
      USING ERRCODE = '22004';
  END IF;

  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot delete their own account'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users AS account WHERE account.id = user_id) THEN
    RAISE EXCEPTION 'User not found'
      USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.profiles AS profile WHERE profile.id = user_id;
  DELETE FROM auth.users AS account WHERE account.id = user_id;
END;
$$;

-- RPCs that work with application rows must obey the caller's RLS policies.
ALTER FUNCTION public.insert_falla_with_wkt(
  uuid,
  double precision,
  text,
  text,
  timestamptz,
  public.estado_falla,
  text
) SECURITY INVOKER;

ALTER FUNCTION public.update_falla_geom(uuid, text) SECURITY INVOKER;
ALTER FUNCTION public.get_reportes_geojson() SECURITY INVOKER;

-- Pin the search path on every application-owned function. Extension functions
-- are excluded because their lifecycle belongs to Supabase/PostGIS.
DO $$
DECLARE
  function_record record;
  function_signature text;
BEGIN
  FOR function_record IN
    SELECT
      namespace.nspname AS schema_name,
      procedure.proname AS function_name,
      pg_get_function_identity_arguments(procedure.oid) AS identity_arguments
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend AS dependency
        WHERE dependency.classid = 'pg_proc'::regclass
          AND dependency.objid = procedure.oid
          AND dependency.deptype = 'e'
      )
  LOOP
    function_signature := format(
      '%I.%I(%s)',
      function_record.schema_name,
      function_record.function_name,
      function_record.identity_arguments
    );

    EXECUTE format(
      'ALTER FUNCTION %s SET search_path TO pg_catalog, public, auth',
      function_signature
    );

    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',
      function_signature
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- Replace all historical policies on the application tables. Starting from a
-- clean policy set prevents a permissive legacy policy from being left behind.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'lineas',
        'estructuras',
        'linea_tramos',
        'fallas',
        'reportes',
        'profiles'
      )
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END;
$$;

ALTER TABLE public.lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estructuras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linea_tramos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated operational reads.
CREATE POLICY "Authenticated users can read lineas"
  ON public.lineas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read estructuras"
  ON public.estructuras
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read linea tramos"
  ON public.linea_tramos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read active fallas"
  ON public.fallas
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can read reportes"
  ON public.reportes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read own profile and admins can read profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (SELECT public.is_admin())
  );

-- Administrative writes. A FOR ALL policy also lets administrators inspect
-- soft-deleted fallas when they query them explicitly.
CREATE POLICY "Admins can manage lineas"
  ON public.lineas
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can manage estructuras"
  ON public.estructuras
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can manage linea tramos"
  ON public.linea_tramos
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can manage fallas"
  ON public.fallas
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can manage reportes"
  ON public.reportes
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- -----------------------------------------------------------------------------
-- Table and schema grants. RLS is the row-level layer; these grants are the
-- object-level layer required by the Supabase Data API.
-- -----------------------------------------------------------------------------
REVOKE USAGE ON SCHEMA public FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

REVOKE ALL PRIVILEGES ON TABLE
  public.lineas,
  public.estructuras,
  public.linea_tramos,
  public.fallas,
  public.reportes,
  public.profiles
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.lineas,
  public.estructuras,
  public.linea_tramos,
  public.fallas,
  public.reportes,
  public.profiles
TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.lineas,
  public.estructuras,
  public.linea_tramos,
  public.fallas,
  public.reportes
TO authenticated;

GRANT UPDATE ON TABLE public.profiles TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.lineas,
  public.estructuras,
  public.linea_tramos,
  public.fallas,
  public.reportes,
  public.profiles
TO service_role;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- -----------------------------------------------------------------------------
-- Explicit RPC allow-list.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_lineas_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_estructuras_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fallas_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reportes_geojson() TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.insert_falla_with_wkt(
  uuid,
  double precision,
  text,
  text,
  timestamptz,
  public.estado_falla,
  text
) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.update_falla_geom(uuid, text) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_all_users_with_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_point_coords(public.geometry) TO service_role;
GRANT EXECUTE ON FUNCTION public.interpolate_point(
  public.geometry,
  public.geometry,
  double precision,
  double precision,
  double precision
) TO service_role;
GRANT EXECUTE ON FUNCTION public.interpolate_line_point(public.geometry, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.rebuild_linea_geom_from_tramos(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.compute_estructuras_km_from_linea(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_kmz_import_for_linea(uuid) TO service_role;

-- Future objects created by postgres are private by default. New tables and
-- functions must be opted into the Data API by a reviewed migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;

-- PostGIS was originally installed in public and owns spatial_ref_sys through
-- supabase_admin. The postgres migration role cannot safely enable RLS or revoke
-- the owner-issued grants on that extension table. Relocating PostGIS requires a
-- separate maintenance operation and is intentionally not attempted here.
