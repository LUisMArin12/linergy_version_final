/*
  # Explicit Data API Grants for Supabase

  Supabase is changing the default behavior for new tables in the public schema:
  tables are no longer automatically exposed to the Data API unless the project
  grants access explicitly.

  This migration makes Linergy compatible with that behavior by adding explicit
  grants for the tables and RPC functions used by the frontend and Edge Functions.

  Important:
  - GRANT only exposes the object to a Postgres role.
  - Row Level Security still decides which rows/actions are allowed.
  - The dashboard is protected by authentication, so application data is granted
    to authenticated and service_role, not to anon.
*/

-- -----------------------------------------------------------------------------
-- Schema access required by PostgREST / supabase-js.
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Current application tables.
-- Keep grants explicit and aligned with the protected-dashboard model.
-- -----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lineas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.estructuras TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fallas TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reportes TO authenticated, service_role;

-- Tables that may not exist in older or cleaned deployments.
DO $$
BEGIN
  IF to_regclass('public.linea_tramos') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.linea_tramos TO authenticated, service_role;
  END IF;

  IF to_regclass('public.subestaciones') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.subestaciones TO authenticated, service_role;
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO authenticated, service_role;
  END IF;
END $$;

-- Sequences are not heavily used because IDs are UUIDs, but this prevents future
-- serial/identity columns from failing through the Data API.
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RPC functions consumed by the frontend.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_lineas_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_estructuras_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fallas_geojson() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.insert_falla_with_wkt(uuid, double precision, text, text, timestamptz, estado_falla, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_falla_geom(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_all_users_with_profiles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated, service_role;

-- Optional / deployment-dependent RPC functions.
DO $$
BEGIN
  IF to_regprocedure('public.get_reportes_geojson()') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_reportes_geojson() TO authenticated, service_role;
  END IF;

  IF to_regprocedure('public.get_audit_logs(uuid,timestamp with time zone,timestamp with time zone,text)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_audit_logs(uuid, timestamptz, timestamptz, text) TO authenticated, service_role;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Internal geometry/import routines used by Edge Functions through service_role.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_point_coords(geometry) TO service_role;
GRANT EXECUTE ON FUNCTION public.interpolate_point(geometry, double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.interpolate_line_point(geometry, double precision) TO service_role;

DO $$
BEGIN
  IF to_regprocedure('public.rebuild_linea_geom_from_tramos(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.rebuild_linea_geom_from_tramos(uuid) TO service_role;
  END IF;

  IF to_regprocedure('public.compute_estructuras_km_from_linea(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.compute_estructuras_km_from_linea(uuid) TO service_role;
  END IF;

  IF to_regprocedure('public.finalize_kmz_import_for_linea(uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.finalize_kmz_import_for_linea(uuid) TO service_role;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Default privileges for future migrations executed by the postgres role.
-- This prevents new public tables/routines/sequences from becoming invisible to
-- supabase-js/PostgREST after Supabase's new default is enforced.
-- -----------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON ROUTINES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO authenticated, service_role;
