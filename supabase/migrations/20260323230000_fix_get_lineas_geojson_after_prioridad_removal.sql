/*
  Corrige la RPC get_lineas_geojson después de eliminar la columna prioridad.
  Se conserva la firma esperada por PostgREST devolviendo prioridad como NULL::int.
*/

DROP FUNCTION IF EXISTS public.get_lineas_geojson();

CREATE FUNCTION public.get_lineas_geojson()
RETURNS TABLE (
  id uuid,
  numero text,
  nombre text,
  km_inicio double precision,
  km_fin double precision,
  clasificacion text,
  prioridad int,
  geom jsonb,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.numero,
    l.nombre,
    l.km_inicio,
    l.km_fin,
    l.clasificacion::text,
    NULL::int AS prioridad,
    ST_AsGeoJSON(l.geom)::jsonb AS geom,
    l.created_at,
    l.updated_at
  FROM public.lineas l;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.get_lineas_geojson() TO anon, authenticated, service_role;
