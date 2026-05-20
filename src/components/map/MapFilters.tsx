import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Chip from '../ui/Chip';
import Badge from '../ui/Badge';
import { Filter, ChevronDown, X, Sparkles } from 'lucide-react';
import { Classification, FaultStatus } from '../../types';

export interface FilterState {
  classifications: Classification[];
  statuses: FaultStatus[];
  showFaults: boolean;
  showStructures: boolean;
}

interface MapFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  initialShowFaults?: boolean;
  initialShowStructures?: boolean;
}

const DEFAULT_STATUSES: FaultStatus[] = ['Abierta', 'En atención'];

export default function MapFilters({
  onFiltersChange,
  initialShowFaults = true,
  initialShowStructures = true,
}: MapFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    classifications: [],
    statuses: DEFAULT_STATUSES,
    showFaults: initialShowFaults,
    showStructures: initialShowStructures,
  });

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const updateFilters = (update: Partial<FilterState>) => setFilters((prev) => ({ ...prev, ...update }));

  const toggleClassification = (c: Classification) => {
    setFilters((prev) => ({
      ...prev,
      classifications: prev.classifications.includes(c)
        ? prev.classifications.filter((x) => x !== c)
        : [...prev.classifications, c],
    }));
  };

  const toggleStatus = (s: FaultStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(s) ? prev.statuses.filter((x) => x !== s) : [...prev.statuses, s],
    }));
  };

  const activeFiltersCount =
    filters.classifications.length +
    filters.statuses.length +
    (filters.showFaults ? 0 : 1) +
    (filters.showStructures ? 0 : 1);

  const clearAllFilters = () => {
    setFilters({
      classifications: [],
      statuses: DEFAULT_STATUSES,
      showFaults: true,
      showStructures: true,
    });
  };

  return (
    <div className="surface-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-[rgba(15,23,42,0.02)]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A] shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#0f172a]">Filtros operativos</span>
              {activeFiltersCount > 0 && <Badge>{activeFiltersCount}</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-[#64748b]">
              {isExpanded ? 'Contraer panel' : 'Expandir criterios de visualización'}
            </p>
          </div>
        </div>

        <ChevronDown className={`h-5 w-5 text-[#64748b] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[rgba(15,23,42,0.06)]"
          >
            <div className="space-y-5 p-4">
              <div className="surface-muted flex items-start justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">Resumen</p>
                  <p className="mt-1 text-xs leading-5 text-[#64748b]">
                    Ajusta clasificación, estado y visibilidad para reducir ruido en el mapa.
                  </p>
                </div>
                <Sparkles className="mt-0.5 h-4 w-4 text-[#157A5A]" />
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 transition-colors hover:text-red-700"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros
                </button>
              )}

              <div>
                <label className="section-heading mb-3 block">Clasificación</label>
                <div className="flex flex-wrap gap-2">
                  {(['Alta', 'Moderada', 'Baja'] as Classification[]).map((c) => (
                    <Chip key={c} selected={filters.classifications.includes(c)} onClick={() => toggleClassification(c)}>
                      {c}
                    </Chip>
                  ))}
                </div>
              </div>

              <div>
                <label className="section-heading mb-3 block">Estado de falla</label>
                <div className="flex flex-wrap gap-2">
                  {(['Abierta', 'En atención', 'Cerrada'] as FaultStatus[]).map((s) => (
                    <Chip key={s} selected={filters.statuses.includes(s)} onClick={() => toggleStatus(s)}>
                      {s}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="border-t border-[rgba(15,23,42,0.06)] pt-4">
                <label className="section-heading mb-3 block">Visibilidad</label>
                <div className="space-y-3">
                  <label className="surface-muted flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">Mostrar fallas</p>
                      <p className="mt-1 text-xs text-[#64748b]">Activa o desactiva marcadores de incidencias en el mapa.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filters.showFaults}
                      onChange={(e) => updateFilters({ showFaults: e.target.checked })}
                      className="h-4 w-4 rounded text-[#157A5A] focus:ring-[#157A5A]"
                    />
                  </label>

                  <label className="surface-muted flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#0f172a]">Mostrar estructuras</p>
                      <p className="mt-1 text-xs text-[#64748b]">Permite ver u ocultar las estructuras físicas de las líneas.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={filters.showStructures}
                      onChange={(e) => updateFilters({ showStructures: e.target.checked })}
                      className="h-4 w-4 rounded text-[#157A5A] focus:ring-[#157A5A]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
