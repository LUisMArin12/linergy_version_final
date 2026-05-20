import { useMemo } from 'react';
import { Route, AlertTriangle, Eye, EyeOff, Layers3 } from 'lucide-react';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { Estructura, Falla, Linea } from '../../lib/supabase';
import { getFaultStructureReference } from '../../lib/structureReference';

interface ItemsListProps {
  estructuras: Estructura[];
  fallas: Falla[];
  lineas: Linea[];
  estructurasReferencia?: Estructura[];
  showLineas?: boolean;
  onToggleLineas?: (next: boolean) => void;
  onSelectEstructura: (e: Estructura) => void;
  onSelectFalla: (f: Falla) => void;
  onSelectLinea?: (lineaId: string) => void;
}

const estadoLabel: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_ATENCION: 'En atención',
  CERRADA: 'Cerrada',
};

const fmtKm = (km: unknown) => (Number.isFinite(Number(km)) ? Number(km).toFixed(1) : 'N/A');

export default function ItemsList({
  estructuras,
  fallas,
  lineas,
  estructurasReferencia = estructuras,
  showLineas = true,
  onToggleLineas,
  onSelectEstructura,
  onSelectFalla,
  onSelectLinea,
}: ItemsListProps) {
  const hasItems = estructuras.length > 0 || fallas.length > 0 || lineas.length > 0;
  const visibleLineasCount = showLineas ? lineas.length : 0;
  const totalCount = estructuras.length + fallas.length + visibleLineasCount;
  const lineasMap = useMemo(() => new Map(lineas.map((l) => [l.id, l])), [lineas]);

  return (
    <div className="space-y-3 pb-6">
      <div className="surface-panel px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(15,23,42,0.05)] text-[#157A5A]">
              <Layers3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#0f172a]">Resultados</h3>
              <p className="mt-1 text-xs text-[#64748b]">{totalCount} {totalCount === 1 ? 'elemento' : 'elementos'} visibles</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleLineas?.(!showLineas)}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 text-xs font-medium text-[#0f172a] shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5"
            aria-label={showLineas ? 'Ocultar resultados de líneas' : 'Mostrar resultados de líneas'}
            title={showLineas ? 'Ocultar líneas' : 'Mostrar líneas'}
          >
            {showLineas ? <EyeOff className="h-4 w-4 text-[#64748b]" /> : <Eye className="h-4 w-4 text-[#64748b]" />}
            <span>Líneas ({lineas.length})</span>
          </button>
        </div>
      </div>

      {!hasItems ? (
        <div className="surface-panel px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(15,23,42,0.05)]">
            <Route className="h-6 w-6 text-[#64748b]" />
          </div>
          <p className="mt-3 text-sm text-[#64748b]">No hay resultados con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {showLineas ? (
            lineas.map((linea) => (
              <Card key={linea.id} hover clickable onClick={() => onSelectLinea?.(linea.id)} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#ffe8ff] text-[#d946ef]">
                    <Route className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">{linea.numero}</p>
                      <Badge variant="classification" classification={linea.clasificacion}>{linea.clasificacion}</Badge>
                    </div>
                    {linea.nombre && <p className="mt-1 truncate text-sm text-[#64748b]">{linea.nombre}</p>}
                    {linea.km_inicio !== null && linea.km_fin !== null && (
                      <p className="mt-2 text-xs text-[#64748b]">{fmtKm(linea.km_inicio)} - {fmtKm(linea.km_fin)} km</p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="surface-muted px-4 py-3">
              <p className="text-xs text-[#64748b]">Resultados de líneas ocultos para reducir carga visual.</p>
            </div>
          )}

          {estructuras.map((estructura) => {
            const linea = lineasMap.get(estructura.linea_id);
            return (
              <Card key={estructura.id} hover clickable onClick={() => onSelectEstructura(estructura)} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
                    <Route className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">{linea?.numero || 'N/A'}</p>
                      {linea && <Badge variant="classification" classification={linea.clasificacion}>{linea.clasificacion}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">Estructura {estructura.numero_estructura} · Km {fmtKm(estructura.km)}</p>
                  </div>
                </div>
              </Card>
            );
          })}

          {fallas.map((falla) => {
            const linea = lineasMap.get(falla.linea_id);
            const fecha = new Date(falla.ocurrencia_ts);
            const fechaStr = Number.isNaN(fecha.getTime()) ? 'N/A' : fecha.toLocaleDateString('es-ES');
            const horaStr = Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            const estructuraRef = getFaultStructureReference(falla, estructurasReferencia);

            return (
              <Card key={falla.id} hover clickable onClick={() => onSelectFalla(falla)} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[#0f172a]">{falla.tipo}</p>
                      <Badge variant="status" status={falla.estado}>{estadoLabel[falla.estado] || falla.estado}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-[#64748b]">{linea?.numero || 'N/A'} · Km {fmtKm(falla.km)}</p>
                    <p className="mt-1 text-xs font-medium text-[#157A5A]">{estructuraRef.label}</p>
                    <p className="mt-2 text-xs text-[#64748b]">{fechaStr} {horaStr}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
