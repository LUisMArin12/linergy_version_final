import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { XMLParser } from 'npm:fast-xml-parser@4.3.4';
import JSZip from 'npm:jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, apikey',
};

interface ImportResult {
  lineas_created: number;
  tramos_inserted: number;
  estructuras_inserted: number;
  lineas_finalized: number;
  errores: string[];
  warnings: string[];
}

interface KmlDataField {
  '@_name'?: string;
  value?: string | number | boolean;
}

interface ExtendedDataNode {
  Data?: KmlDataField | KmlDataField[];
}

interface LineStringNode {
  coordinates?: string;
}

interface PointNode {
  coordinates?: string;
}

interface PlacemarkNode {
  name?: string;
  ExtendedData?: ExtendedDataNode;
  LineString?: LineStringNode;
  Point?: PointNode;
}

interface FolderNode {
  name?: string;
  Folder?: FolderNode | FolderNode[];
  Placemark?: PlacemarkNode | PlacemarkNode[];
}

interface DocumentNode {
  Folder?: FolderNode | FolderNode[];
  Placemark?: PlacemarkNode | PlacemarkNode[];
}

interface KmlParseResult {
  kml?: {
    Document?: DocumentNode;
  };
}

type SupabaseAdminClient = ReturnType<typeof createClient>;

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

function parseCoordinates(coordString: string): Array<[number, number]> {
  const coords: Array<[number, number]> = [];
  const parts = coordString.trim().split(/\s+/);

  for (const part of parts) {
    const values = part.split(',');
    if (values.length >= 2) {
      const lon = parseFloat(values[0]);
      const lat = parseFloat(values[1]);
      if (!isNaN(lon) && !isNaN(lat)) {
        coords.push([lon, lat]);
      }
    }
  }

  return coords;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getExtendedDataValue(extendedData: ExtendedDataNode | undefined, key: string): string | null {
  if (!extendedData || !extendedData.Data) return null;

  const dataArray = ensureArray(extendedData.Data);
  for (const data of dataArray) {
    if (data['@_name'] === key && data.value) {
      return data.value.toString().trim();
    }
  }

  return null;
}

async function upsertLinea(supabaseAdmin: SupabaseAdminClient, lineaNumero: string, result: ImportResult) {
  const { data: existingLinea, error: existingError } = await supabaseAdmin
    .from('lineas')
    .select('id')
    .eq('numero', lineaNumero)
    .maybeSingle();

  if (existingError) {
    result.errores.push(`Failed to lookup linea ${lineaNumero}: ${existingError.message}`);
    return null;
  }

  if (existingLinea) {
    const { error: deleteTramosError } = await supabaseAdmin.from('linea_tramos').delete().eq('linea_id', existingLinea.id);
    if (deleteTramosError) {
      result.errores.push(`Failed to clear tramos for linea ${lineaNumero}: ${deleteTramosError.message}`);
      return null;
    }

    const { error: deleteEstructurasError } = await supabaseAdmin.from('estructuras').delete().eq('linea_id', existingLinea.id);
    if (deleteEstructurasError) {
      result.errores.push(`Failed to clear estructuras for linea ${lineaNumero}: ${deleteEstructurasError.message}`);
      return null;
    }

    const { error: updateLineaError } = await supabaseAdmin
      .from('lineas')
      .update({ nombre: lineaNumero })
      .eq('id', existingLinea.id);

    if (updateLineaError) {
      result.warnings.push(`No se pudo actualizar el nombre de la línea ${lineaNumero}: ${updateLineaError.message}`);
    }

    return existingLinea.id as string;
  }

  const { data: newLinea, error: insertError } = await supabaseAdmin
    .from('lineas')
    .insert({ numero: lineaNumero, nombre: lineaNumero })
    .select('id')
    .single();

  if (insertError || !newLinea) {
    result.errores.push(`Failed to create linea ${lineaNumero}: ${insertError?.message || 'Unknown error'}`);
    return null;
  }

  result.lineas_created++;
  return newLinea.id as string;
}

async function processFolderStructure(document: DocumentNode, supabaseAdmin: SupabaseAdminClient, result: ImportResult) {
  const folders = ensureArray(document.Folder);

  for (const folder of folders) {
    const folderName = folder.name;
    if (!folderName) continue;

    const lineaNumero = folderName.toString().trim();
    const lineaId = await upsertLinea(supabaseAdmin, lineaNumero, result);
    if (!lineaId) continue;

    const subFolders = ensureArray(folder.Folder);
    let lineaAereaFolder: FolderNode | null = null;
    let estructurasFolder: FolderNode | null = null;

    for (const subFolder of subFolders) {
      const subFolderName = subFolder.name?.toString().toLowerCase() || '';
      if (subFolderName.includes('lineaarea') || subFolderName.includes('linea')) {
        lineaAereaFolder = subFolder;
      } else if (subFolderName.includes('estructura')) {
        estructurasFolder = subFolder;
      }
    }

    const tramosBefore = result.tramos_inserted;
    let orden = 0;

    if (lineaAereaFolder) {
      const placemarks = ensureArray(lineaAereaFolder.Placemark);

      for (const placemark of placemarks) {
        const lineString = placemark.LineString;
        if (!lineString?.coordinates) continue;

        const coordsText = lineString.coordinates.toString().trim();
        const coords = parseCoordinates(coordsText);
        if (coords.length < 2) continue;

        const lineWKT = `LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(', ')})`;
        const { error } = await supabaseAdmin.from('linea_tramos').insert({
          linea_id: lineaId,
          orden: orden++,
          geom: lineWKT,
        });

        if (error) {
          result.errores.push(`Failed to insert tramo for linea ${lineaNumero}: ${error.message}`);
        } else {
          result.tramos_inserted++;
        }
      }
    }

    if (estructurasFolder) {
      const placemarks = ensureArray(estructurasFolder.Placemark);

      for (const placemark of placemarks) {
        const name = placemark.name?.toString().trim();
        const point = placemark.Point;
        if (!name || !point?.coordinates) continue;

        const coords = parseCoordinates(point.coordinates.toString().trim());
        if (coords.length === 0) continue;

        const [lon, lat] = coords[0];
        const pointWKT = `POINT(${lon} ${lat})`;

        const { error } = await supabaseAdmin.from('estructuras').insert({
          linea_id: lineaId,
          numero_estructura: name,
          km: 0,
          geom: pointWKT,
        });

        if (error) {
          result.errores.push(`Failed to insert estructura ${name} for linea ${lineaNumero}: ${error.message}`);
        } else {
          result.estructuras_inserted++;
        }
      }
    }

    if (result.tramos_inserted > tramosBefore) {
      const { error: finalizeError } = await supabaseAdmin.rpc('finalize_kmz_import_for_linea', {
        p_linea_id: lineaId,
      });

      if (finalizeError) {
        result.errores.push(`Failed to finalize linea ${lineaNumero}: ${finalizeError.message}`);
      } else {
        result.lineas_finalized++;
      }
    } else {
      result.warnings.push(`No line segments found for linea ${lineaNumero}, skipping finalization`);
    }
  }
}

async function processPlacemarkStructure(document: DocumentNode, supabaseAdmin: SupabaseAdminClient, result: ImportResult) {
  const placemarks = ensureArray(document.Placemark);
  const lineasMap = new Map<string, { tramos: PlacemarkNode[]; estructuras: PlacemarkNode[] }>();

  for (const placemark of placemarks) {
    const lineaNumero = getExtendedDataValue(placemark.ExtendedData, 'linea');
    if (!lineaNumero) continue;

    if (!lineasMap.has(lineaNumero)) {
      lineasMap.set(lineaNumero, { tramos: [], estructuras: [] });
    }

    const lineaData = lineasMap.get(lineaNumero)!;
    const isEstructura = getExtendedDataValue(placemark.ExtendedData, 'estructura');

    if (placemark.LineString) {
      lineaData.tramos.push(placemark);
    } else if (placemark.Point && isEstructura) {
      lineaData.estructuras.push(placemark);
    }
  }

  for (const [lineaNumero, data] of lineasMap) {
    const lineaId = await upsertLinea(supabaseAdmin, lineaNumero, result);
    if (!lineaId) continue;

    let orden = 0;
    for (const tramoPlacemark of data.tramos) {
      const tramoCoordinates = tramoPlacemark.LineString?.coordinates;
      if (!tramoCoordinates) continue;

      const coordsText = tramoCoordinates.toString().trim();
      const coords = parseCoordinates(coordsText);
      if (coords.length < 2) continue;

      const lineWKT = `LINESTRING(${coords.map((c) => `${c[0]} ${c[1]}`).join(', ')})`;
      const { error } = await supabaseAdmin.from('linea_tramos').insert({
        linea_id: lineaId,
        orden: orden++,
        geom: lineWKT,
      });

      if (error) {
        result.errores.push(`Failed to insert tramo for linea ${lineaNumero}: ${error.message}`);
      } else {
        result.tramos_inserted++;
      }
    }

    for (const estructuraPlacemark of data.estructuras) {
      const name = estructuraPlacemark.name?.toString().trim();
      const estructuraCoordinates = estructuraPlacemark.Point?.coordinates;
      if (!estructuraCoordinates || !name) continue;

      const coordsText = estructuraCoordinates.toString().trim();
      const coords = parseCoordinates(coordsText);
      if (coords.length === 0) continue;

      const [lon, lat] = coords[0];
      const pointWKT = `POINT(${lon} ${lat})`;

      const { error } = await supabaseAdmin.from('estructuras').insert({
        linea_id: lineaId,
        numero_estructura: name,
        km: 0,
        geom: pointWKT,
      });

      if (error) {
        result.errores.push(`Failed to insert estructura ${name} for linea ${lineaNumero}: ${error.message}`);
      } else {
        result.estructuras_inserted++;
      }
    }

    if (data.tramos.length > 0) {
      const { error: finalizeError } = await supabaseAdmin.rpc('finalize_kmz_import_for_linea', {
        p_linea_id: lineaId,
      });

      if (finalizeError) {
        result.errores.push(`Failed to finalize linea ${lineaNumero}: ${finalizeError.message}`);
      } else {
        result.lineas_finalized++;
      }
    } else {
      result.warnings.push(`No line segments found for linea ${lineaNumero}, skipping finalization`);
    }
  }
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500);
    }

    if (!profile || profile.role !== 'admin') {
      return jsonResponse({ error: 'Acceso restringido: se requiere rol admin' }, 403);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return jsonResponse({ error: 'No file provided' }, 400);
    }

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.kmz') && !lowerName.endsWith('.kml')) {
      return jsonResponse({ error: 'File must be .kmz or .kml' }, 400);
    }

    let kmlContent: string;

    if (lowerName.endsWith('.kmz')) {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const kmlFiles: Array<{ name: string; content: string }> = [];

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir && filename.toLowerCase().endsWith('.kml')) {
          const content = await zipEntry.async('string');
          kmlFiles.push({ name: filename, content });
        }
      }

      if (kmlFiles.length === 0) {
        return jsonResponse({ error: 'No KML file found in KMZ' }, 400);
      }

      kmlFiles.sort((a, b) => b.content.length - a.content.length);
      kmlContent = kmlFiles[0].content;
    } else {
      kmlContent = await file.text();
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseTagValue: false,
      trimValues: true,
    });

    const kmlData = parser.parse(kmlContent) as KmlParseResult;
    const document = kmlData?.kml?.Document;
    if (!document) {
      return jsonResponse({ error: 'Invalid KML structure: no Document element found' }, 400);
    }

    const result: ImportResult = {
      lineas_created: 0,
      tramos_inserted: 0,
      estructuras_inserted: 0,
      lineas_finalized: 0,
      errores: [],
      warnings: [],
    };

    if (document.Folder) {
      await processFolderStructure(document, supabaseAdmin, result);
    } else if (document.Placemark) {
      await processPlacemarkStructure(document, supabaseAdmin, result);
    } else {
      return jsonResponse({ error: 'No Folders or Placemarks found in KML document' }, 400);
    }

    return jsonResponse(result, 200);
  } catch (error) {
    console.error('Import KMZ error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : String(error),
      },
      500
    );
  }
});
