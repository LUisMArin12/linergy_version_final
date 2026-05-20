import { Estructura, Falla } from './supabase';

export type FaultStructureReferenceMode = 'exact' | 'between' | 'before' | 'after' | 'unavailable';

export type FaultStructureReference = {
  mode: FaultStructureReferenceMode;
  label: string;
  detail: string;
  structures: Estructura[];
};

const KM_TOLERANCE = 0.001;

function isFiniteKm(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function formatKm(value: unknown): string {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(3) : 'N/A';
}

/**
 * Calcula la referencia operacional de una falla contra las estructuras de su misma línea.
 *
 * Regla:
 * - Si el km de la falla coincide con una estructura, se reporta esa estructura.
 * - Si cae entre dos estructuras, se reportan ambas.
 * - Si queda fuera del tramo con estructuras registradas, se reporta la estructura frontera más cercana.
 */
export function getFaultStructureReference(
  falla: Pick<Falla, 'linea_id' | 'km'> | null | undefined,
  estructuras: Estructura[] = []
): FaultStructureReference {
  if (!falla || !isFiniteKm(falla.km)) {
    return {
      mode: 'unavailable',
      label: 'Estructura no disponible',
      detail: 'La falla no tiene un kilómetro válido para calcular la referencia.',
      structures: [],
    };
  }

  const sameLineStructures = estructuras
    .filter((estructura) => estructura.linea_id === falla.linea_id && isFiniteKm(estructura.km))
    .sort((a, b) => a.km - b.km);

  if (sameLineStructures.length === 0) {
    return {
      mode: 'unavailable',
      label: 'Sin estructuras registradas',
      detail: 'No hay estructuras disponibles para la línea de esta falla.',
      structures: [],
    };
  }

  const exact = sameLineStructures.find((estructura) => Math.abs(estructura.km - falla.km) <= KM_TOLERANCE);

  if (exact) {
    return {
      mode: 'exact',
      label: `Estructura ${exact.numero_estructura}`,
      detail: `Coincide con el km ${formatKm(exact.km)}.`,
      structures: [exact],
    };
  }

  let previous: Estructura | null = null;
  let next: Estructura | null = null;

  for (const estructura of sameLineStructures) {
    if (estructura.km < falla.km) previous = estructura;
    if (estructura.km > falla.km) {
      next = estructura;
      break;
    }
  }

  if (previous && next) {
    return {
      mode: 'between',
      label: `Entre estructuras ${previous.numero_estructura} y ${next.numero_estructura}`,
      detail: `La falla está en el tramo km ${formatKm(previous.km)} – ${formatKm(next.km)}.`,
      structures: [previous, next],
    };
  }

  if (previous) {
    return {
      mode: 'after',
      label: `Después de estructura ${previous.numero_estructura}`,
      detail: `La estructura registrada anterior más cercana está en el km ${formatKm(previous.km)}.`,
      structures: [previous],
    };
  }

  const first = sameLineStructures[0];
  return {
    mode: 'before',
    label: `Antes de estructura ${first.numero_estructura}`,
    detail: `La primera estructura registrada está en el km ${formatKm(first.km)}.`,
    structures: [first],
  };
}
