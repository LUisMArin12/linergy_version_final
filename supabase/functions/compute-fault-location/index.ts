import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, apikey',
};

interface ComputeLocationRequest {
  lineaId: string;
  km: number;
}

interface ComputeLocationResponse {
  lat: number;
  lon: number;
  geom: string;
  method: 'interpolation' | 'single_structure' | 'line_geometry';
}

type EstructuraRow = { km: number | string | null; geom: string | null };

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization');
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

async function authenticateRequest(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    return { user: null, error: 'Missing Authorization header' };
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { user: null, error: error?.message || 'Invalid JWT' };
  }

  return { user: data.user, error: null };
}

function firstRow<T>(data: unknown): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  return data as T;
}

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function extractLatLon(data: unknown): { lat: number; lon: number } | null {
  const row = firstRow<Record<string, unknown>>(data);
  if (!row) return null;

  const lat = toNum(row.lat ?? row.latitude);
  const lon = toNum(row.lon ?? row.lng ?? row.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { user, error: authError } = await authenticateRequest(req);
    if (authError || !user) {
      return jsonResponse({ error: authError || 'Invalid JWT' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = (await req.json()) as ComputeLocationRequest;
    const lineaId = body?.lineaId;
    const km = Number(body?.km);

    if (!lineaId || !Number.isFinite(km)) {
      return jsonResponse({ error: 'lineaId and km are required' }, 400);
    }

    const { data: linea, error: lineaError } = await supabaseAdmin
      .from('lineas')
      .select('id, km_inicio, km_fin, geom')
      .eq('id', lineaId)
      .maybeSingle();

    if (lineaError || !linea) {
      return jsonResponse({ error: 'Line not found' }, 404);
    }

    const kmInicio = linea.km_inicio !== null ? Number(linea.km_inicio) : null;
    const kmFin = linea.km_fin !== null ? Number(linea.km_fin) : null;

    if (kmInicio !== null && kmFin !== null && Number.isFinite(kmInicio) && Number.isFinite(kmFin)) {
      if (km < kmInicio || km > kmFin) {
        return jsonResponse({ error: `km ${km} is out of range [${kmInicio}, ${kmFin}]` }, 400);
      }
    }

    const { data: estructuras, error: estructurasError } = await supabaseAdmin
      .from('estructuras')
      .select('km, geom')
      .eq('linea_id', lineaId)
      .order('km', { ascending: true });

    if (estructurasError) throw estructurasError;

    if (estructuras && estructuras.length > 0) {
      let e1: EstructuraRow | null = null;
      let e2: EstructuraRow | null = null;

      for (const est of estructuras) {
        const estKm = Number(est.km);
        if (Number.isFinite(estKm) && estKm <= km) e1 = est;
        if (Number.isFinite(estKm) && estKm >= km && !e2) e2 = est;
      }

      if (e1 && e2 && Number(e1.km) !== Number(e2.km)) {
        const { data: coordsData, error } = await supabaseAdmin.rpc('interpolate_point', {
          p_geom1: e1.geom,
          p_geom2: e2.geom,
          p_km1: Number(e1.km),
          p_km2: Number(e2.km),
          p_km_target: km,
        });
        if (error) throw error;

        const coords = extractLatLon(coordsData);
        if (coords) {
          return jsonResponse({
            lat: coords.lat,
            lon: coords.lon,
            geom: `POINT(${coords.lon} ${coords.lat})`,
            method: 'interpolation',
          } as ComputeLocationResponse);
        }
      }

      const single = e1 && !e2 ? e1 : !e1 && e2 ? e2 : null;
      if (single) {
        const { data: coordsData, error } = await supabaseAdmin.rpc('get_point_coords', {
          p_geom: single.geom,
        });
        if (error) throw error;

        const coords = extractLatLon(coordsData);
        if (coords) {
          return jsonResponse({
            lat: coords.lat,
            lon: coords.lon,
            geom: `POINT(${coords.lon} ${coords.lat})`,
            method: 'single_structure',
          } as ComputeLocationResponse);
        }
      }
    }

    if (linea.geom && kmInicio !== null && kmFin !== null && kmFin > kmInicio) {
      let fraction = (km - kmInicio) / (kmFin - kmInicio);
      fraction = Math.max(0, Math.min(1, fraction));

      const { data: coordsData, error } = await supabaseAdmin.rpc('interpolate_line_point', {
        p_line_geom: linea.geom,
        p_fraction: fraction,
      });
      if (error) throw error;

      const coords = extractLatLon(coordsData);
      if (coords) {
        return jsonResponse({
          lat: coords.lat,
          lon: coords.lon,
          geom: `POINT(${coords.lon} ${coords.lat})`,
          method: 'line_geometry',
        } as ComputeLocationResponse);
      }
    }

    return jsonResponse(
      { error: 'Cannot compute location: no valid coords from structures or line geometry' },
      400
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: msg }, 500);
  }
});
