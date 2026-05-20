import { createClient } from '@supabase/supabase-js';
import { GeoJSONGeometry, isGeoJSONGeometry } from '../types/geo';
import { handleAuthError } from './authErrorHandler';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Linea = {
  id: string;
  numero: string;
  nombre: string | null;
  km_inicio: number | null;
  km_fin: number | null;
  clasificacion: 'ALTA' | 'MODERADA' | 'BAJA';
  geom: string | GeoJSONGeometry | null;
  created_at: string;
  updated_at: string;
};

export type Estructura = {
  id: string;
  linea_id: string;
  numero_estructura: string;
  km: number;
  geom: string | GeoJSONGeometry;
  created_at: string;
  updated_at: string;
};

export type Falla = {
  id: string;
  linea_id: string;
  km: number;
  tipo: string;
  descripcion: string | null;
  estado: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA';
  ocurrencia_ts: string;
  geom: string | GeoJSONGeometry | null;
  created_at: string;
  updated_at: string;
};

export type Reporte = {
  id: string;
  falla_id: string | null;
  linea_id: string;
  km: number;
  tipo: string;
  descripcion: string | null;
  estado: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA';
  ocurrencia_ts: string;
  geom: string | GeoJSONGeometry | null;
  created_at: string;
  updated_at: string;
};

export function parseGeometry(geom: string | GeoJSONGeometry | null | undefined): GeoJSONGeometry | null {
  if (!geom) return null;

  if (isGeoJSONGeometry(geom)) return geom;

  if (typeof geom !== 'string') return null;

  try {
    const parsed: unknown = JSON.parse(geom);
    if (isGeoJSONGeometry(parsed)) return parsed;
  } catch {
    // ignore
  }

  const upper = geom.trim().toUpperCase();

  if (upper.startsWith('POINT')) {
    const match = geom.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      const lon = Number(match[1]);
      const lat = Number(match[2]);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return { type: 'Point', coordinates: [lon, lat] };
      }
    }
  }

  if (upper.startsWith('LINESTRING')) {
    const match = geom.match(/LINESTRING\s*\((.+)\)/i);
    if (match) {
      const coords = match[1]
        .split(',')
        .map((pair) => pair.trim().split(/\s+/))
        .map(([lonStr, latStr]) => [Number(lonStr), Number(latStr)] as [number, number])
        .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
      if (coords.length >= 2) return { type: 'LineString', coordinates: coords };
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function get(root: unknown, path: string[]): unknown {
  let current: unknown = root;
  for (const key of path) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function pickNumber(...candidates: unknown[]) {
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

async function parseFunctionInvokeError(error: unknown, fallback: string): Promise<Error> {
  if (!error) return new Error(fallback);

  if (error instanceof Error) {
    const withContext = error as Error & { context?: Response };
    if (withContext.context instanceof Response) {
      try {
        const contentType = withContext.context.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const payload = await withContext.context.clone().json();
          const message =
            (isRecord(payload) &&
              (String(payload.error ?? payload.message ?? payload.msg ?? '') || '')) ||
            '';
          if (message) return new Error(message);
        }

        const text = await withContext.context.clone().text();
        if (text) return new Error(text);
      } catch {
        // ignore and fall back to original message
      }
    }

    return new Error(error.message || fallback);
  }

  return new Error(String(error));
}

export async function callRpc<T>(
  functionName: string,
  params: Record<string, unknown>
): Promise<T> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error(`RPC ${functionName} error:`, error);
      await handleAuthError(error);
      throw error;
    }

    return data as T;
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}

/**
 * Normaliza la respuesta del Edge Function para siempre regresar:
 * { lat: number, lon: number }
 */
export async function computeFaultLocation(
  lineaId: string,
  km: number
): Promise<{ lat: number; lon: number }> {
  try {
    const { data, error } = await supabase.functions.invoke('compute-fault-location', {
      body: { lineaId, km },
    });

    if (error) {
      const normalized = await parseFunctionInvokeError(
        error,
        'No se pudo calcular la ubicación. Verifica el kilómetro ingresado.'
      );
      await handleAuthError(normalized);
      throw normalized;
    }

    const payload = data as unknown;

    const lat = pickNumber(
      get(payload, ['lat']),
      get(payload, ['latitude']),
      get(payload, ['data', 'lat']),
      get(payload, ['data', 'latitude']),
      get(payload, ['location', 'lat']),
      get(payload, ['location', 'latitude'])
    );

    const lon = pickNumber(
      get(payload, ['lon']),
      get(payload, ['lng']),
      get(payload, ['longitude']),
      get(payload, ['data', 'lon']),
      get(payload, ['data', 'lng']),
      get(payload, ['data', 'longitude']),
      get(payload, ['location', 'lon']),
      get(payload, ['location', 'lng']),
      get(payload, ['location', 'longitude'])
    );

    if (lat !== null && lon !== null) return { lat, lon };

    const wktCandidate = get(payload, ['geom']) ?? get(payload, ['wkt']) ?? get(payload, ['geom_wkt']);
    const wkt = typeof wktCandidate === 'string' ? wktCandidate : undefined;

    if (wkt && wkt.toUpperCase().startsWith('POINT')) {
      const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
      if (match) {
        const lon2 = Number(match[1]);
        const lat2 = Number(match[2]);
        if (Number.isFinite(lat2) && Number.isFinite(lon2)) return { lat: lat2, lon: lon2 };
      }
    }

    const geomCandidate = get(payload, ['geom']) ?? get(payload, ['geometry']);
    if (isGeoJSONGeometry(geomCandidate) && geomCandidate.type === 'Point') {
      const [lon3, lat3] = geomCandidate.coordinates;
      if (Number.isFinite(lat3) && Number.isFinite(lon3)) return { lat: lat3, lon: lon3 };
    }

    throw new Error('El kilómetro ingresado está fuera del rango de la línea seleccionada');
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}

export async function importKMZ(file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data, error } = await supabase.functions.invoke('import-kmz', {
      body: formData,
    });

    if (error) {
      const normalized = await parseFunctionInvokeError(
        error,
        'Error al importar el archivo KMZ. Verifica el formato del archivo.'
      );
      await handleAuthError(normalized);
      throw normalized;
    }

    return data;
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}

export interface UpdateFallaPayload {
  lineaId?: string;
  km?: number;
  tipo?: string;
  descripcion?: string | null;
  estado?: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA';
  fecha?: string;
  hora?: string;
}

export async function updateFalla(fallaId: string, payload: UpdateFallaPayload) {
  try {
    let geomWkt: string | undefined;

    if (payload.lineaId !== undefined && payload.km !== undefined) {
      const location = await computeFaultLocation(payload.lineaId, payload.km);
      geomWkt = `POINT(${location.lon} ${location.lat})`;
    }

    let ocurrenciaTs: string | undefined;
    if (payload.fecha !== undefined && payload.hora !== undefined) {
      ocurrenciaTs = new Date(`${payload.fecha}T${payload.hora}`).toISOString();
    }

    const updateData: Partial<{ linea_id: string; km: number; tipo: string; descripcion: string | null; estado: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA'; ocurrencia_ts: string }> = {};
    if (payload.lineaId !== undefined) updateData.linea_id = payload.lineaId;
    if (payload.km !== undefined) updateData.km = payload.km;
    if (payload.tipo !== undefined) updateData.tipo = payload.tipo;
    if (payload.descripcion !== undefined) updateData.descripcion = payload.descripcion;
    if (payload.estado !== undefined) updateData.estado = payload.estado;
    if (ocurrenciaTs !== undefined) updateData.ocurrencia_ts = ocurrenciaTs;
    if (geomWkt !== undefined) {
      await callRpc('update_falla_geom', {
        p_falla_id: fallaId,
        p_geom_wkt: geomWkt,
      });
    }

    const { data, error } = await supabase
      .from('fallas')
      .update(updateData)
      .eq('id', fallaId)
      .select()
      .single();

    if (error) {
      await handleAuthError(error);
      throw error;
    }
    return data;
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}


export async function setFallaEstado(
  fallaId: string,
  estado: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA'
) {
  try {
    const { data, error } = await supabase
      .from('fallas')
      .update({ estado })
      .eq('id', fallaId)
      .select()
      .single();

    if (error) {
      await handleAuthError(error);
      throw error;
    }

    return data;
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}

export async function deleteReporte(reporteId: string) {
  try {
    const { error } = await supabase.from('reportes').delete().eq('id', reporteId);
    if (error) {
      await handleAuthError(error);
      throw error;
    }
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}

export async function deleteFalla(fallaId: string) {
  try {
    const deletedAt = new Date().toISOString();

    const soft = await supabase
      .from('fallas')
      .update({ deleted_at: deletedAt })
      .eq('id', fallaId)
      .select('id')
      .maybeSingle();

    if (soft.error) {
      await handleAuthError(soft.error);

      const msg = (soft.error as { message?: string })?.message || '';
      const looksLikeMissingColumn = msg.toLowerCase().includes('deleted_at') && msg.toLowerCase().includes('does not exist');

      if (looksLikeMissingColumn) {
        const hard = await supabase
          .from('fallas')
          .delete()
          .eq('id', fallaId)
          .select('id')
          .maybeSingle();

        if (hard.error) {
          await handleAuthError(hard.error);
          throw hard.error;
        }
        if (!hard.data) {
          throw new Error('No se pudo eliminar la falla (sin permisos o no existe).');
        }
        return;
      }

      const hard = await supabase
        .from('fallas')
        .delete()
        .eq('id', fallaId)
        .select('id')
        .maybeSingle();

      if (hard.error) {
        await handleAuthError(hard.error);
        throw hard.error;
      }
      if (!hard.data) {
        throw new Error('No se pudo eliminar la falla (sin permisos o no existe).');
      }
      return;
    }

    if (!soft.data) {
      const hard = await supabase
        .from('fallas')
        .delete()
        .eq('id', fallaId)
        .select('id')
        .maybeSingle();

      if (hard.error) {
        await handleAuthError(hard.error);
        throw hard.error;
      }
      if (!hard.data) {
        throw new Error('No se pudo eliminar la falla (sin permisos o no existe).');
      }
    }
  } catch (error) {
    await handleAuthError(error);
    throw error;
  }
}
