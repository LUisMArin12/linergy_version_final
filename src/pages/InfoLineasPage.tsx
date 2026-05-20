import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, Pencil, X, Download, Trash2, Plus, Lock } from 'lucide-react';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { useSearch } from '../contexts/SearchContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { LINEAS_CATALOG, type LineaCatalogEntry } from '../lib/lineaCatalog';
import { useDragScroll } from '../hooks/useDragScroll';

type OverridesMap = Record<string, Partial<LineaCatalogEntry>>;

const LS_KEY = 'lineas_catalog_overrides_v1';

function loadOverrides(): OverridesMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as OverridesMap;
    return {};
  } catch {
    return {};
  }
}

function saveOverrides(next: OverridesMap) {
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

function mergeEntry(base: LineaCatalogEntry, overrides: OverridesMap): LineaCatalogEntry {
  const o = overrides[base.claveEnlace];
  return o ? ({ ...base, ...o } as LineaCatalogEntry) : base;
}

function matches(entry: LineaCatalogEntry, q: string) {
  const hay = [
    entry.claveEnlace,
    entry.numero,
    entry.descripcion,
    entry.area,
    entry.tension,
    String(entry.kms ?? ''),
    String(entry.nc ?? ''),
    entry.conductor,
    entry.tipoEstructura,
    String(entry.numEstructuras ?? ''),
    String(entry.anio ?? ''),
    entry.comp,
    entry.cveSap,
    String(entry.brecha ?? ''),
    entry.confCond,
    entry.pob,
    entry.ent,
  ]
    .join(' ')
    .toLowerCase();

  return hay.includes(q);
}

type EditFormState = Omit<LineaCatalogEntry, 'kms' | 'nc' | 'numEstructuras' | 'anio' | 'brecha'> & {
  kms: string;
  nc: string;
  numEstructuras: string;
  anio: string;
  brecha: string;
};

function toEditState(e: LineaCatalogEntry): EditFormState {
  return {
    ...e,
    kms: e.kms === null || e.kms === undefined ? '' : String(e.kms),
    nc: e.nc === null || e.nc === undefined ? '' : String(e.nc),
    numEstructuras: e.numEstructuras === null || e.numEstructuras === undefined ? '' : String(e.numEstructuras),
    anio: e.anio === null || e.anio === undefined ? '' : String(e.anio),
    brecha: e.brecha === null || e.brecha === undefined ? '' : String(e.brecha),
  };
}

function toNumberOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function InfoLineasPage() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [editing, setEditing] = useState<LineaCatalogEntry | null>(null);
  const [form, setForm] = useState<EditFormState | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const tableContainerRef = useDragScroll<HTMLDivElement>();
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);


  useEffect(() => {
    setOverrides(loadOverrides());
  }, []);

  const mergedCatalog = useMemo(() => {
    const catalogEntries = LINEAS_CATALOG.map((e) => mergeEntry(e, overrides)).filter((e) => !('hidden' in e && e.hidden));

    const newEntries = Object.entries(overrides)
      .filter(([key, override]) => {
        const existsInCatalog = LINEAS_CATALOG.some(e => e.claveEnlace === key);
        return !existsInCatalog && !('hidden' in override && override.hidden);
      })
      .map(([, override]) => override as LineaCatalogEntry);

    return [...catalogEntries, ...newEntries];
  }, [overrides]);

  const filtered = useMemo(() => {
    const q = (searchQuery ?? '').trim().toLowerCase();
    if (!q) return mergedCatalog;
    return mergedCatalog.filter((e) => matches(e, q));
  }, [searchQuery, mergedCatalog]);

  const openEdit = (e: LineaCatalogEntry) => {
    if (!isAdmin) {
      showToast('Solo los administradores pueden editar registros', 'error');
      return;
    }
    setEditing(e);
    setForm(toEditState(e));
    setIsCreating(false);
  };

  const openCreate = () => {
    if (!isAdmin) {
      showToast('Solo los administradores pueden agregar registros', 'error');
      return;
    }
    const newEntry: LineaCatalogEntry = {
      claveEnlace: '',
      numero: '',
      descripcion: '',
      area: '',
      tension: '',
      kms: null,
      nc: null,
      conductor: '',
      tipoEstructura: '',
      numEstructuras: null,
      anio: null,
      comp: '',
      cveSap: '',
      brecha: null,
      confCond: '',
      pob: '',
      ent: '',
    };
    setEditing(newEntry);
    setForm(toEditState(newEntry));
    setIsCreating(true);
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(null);
    setIsCreating(false);
  };

  const handleSave = () => {
    if (!form) return;

    if (!form.claveEnlace.trim()) {
      showToast('La clave enlace es requerida', 'error');
      return;
    }

    const next: OverridesMap = { ...overrides };

    const newEntry = {
      claveEnlace: form.claveEnlace,
      numero: form.claveEnlace,
      descripcion: form.descripcion,
      area: form.area,
      tension: form.tension,
      kms: toNumberOrNull(form.kms),
      nc: toNumberOrNull(form.nc),
      conductor: form.conductor,
      tipoEstructura: form.tipoEstructura,
      numEstructuras: toNumberOrNull(form.numEstructuras),
      anio: toNumberOrNull(form.anio),
      comp: form.comp,
      cveSap: form.cveSap,
      brecha: toNumberOrNull(form.brecha),
      confCond: form.confCond,
      pob: form.pob,
      ent: form.ent,
    };

    next[form.claveEnlace] = newEntry;

    saveOverrides(next);
    setOverrides(next);
    showToast(isCreating ? 'Registro creado correctamente' : 'Registro actualizado correctamente', 'success');
    closeEdit();
  };

  const handleExportCSV = () => {
    const headers = [
      'Clave Enlace',
      'Número',
      'Descripción',
      'Área',
      'Tensión',
      'Kms',
      'NC',
      'Conductor',
      'Tipo Estructura',
      'Num Estructuras',
      'Año',
      'Comp',
      'Cve SAP',
      'Brecha',
      'Conf Cond',
      'POB',
      'ENT'
    ];

    const rows = filtered.map((linea) => [
      linea.claveEnlace,
      linea.numero,
      linea.descripcion,
      linea.area,
      linea.tension,
      linea.kms ?? '',
      linea.nc ?? '',
      linea.conductor,
      linea.tipoEstructura,
      linea.numEstructuras ?? '',
      linea.anio ?? '',
      linea.comp,
      linea.cveSap,
      linea.brecha ?? '',
      linea.confCond,
      linea.pob,
      linea.ent
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lineas_completo_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filtered.length} registros exportados correctamente`, 'success');
  };

  const handleResetRow = () => {
    if (!editing) return;
    const next: OverridesMap = { ...overrides };
    delete next[editing.claveEnlace];
    saveOverrides(next);
    setOverrides(next);
    closeEdit();
    showToast('Registro restablecido a valores originales', 'success');
  };

  const handleScrollIndicators = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 1);
  }, [tableContainerRef]);

  useEffect(() => {
    handleScrollIndicators();
    const container = tableContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScrollIndicators);
      window.addEventListener('resize', handleScrollIndicators);
      return () => {
        container.removeEventListener('scroll', handleScrollIndicators);
        window.removeEventListener('resize', handleScrollIndicators);
      };
    }
  }, [filtered, handleScrollIndicators, tableContainerRef]);



  return (
    <div className="space-y-6">
      <div className="space-y-6">
    <Modal isOpen={!!editing} onClose={closeEdit} title={isCreating ? "Agregar nueva línea" : "Editar información de línea"} size="lg">
      {!form ? null : (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{isCreating ? 'Nuevo registro' : editing?.claveEnlace}</p>
                <p className="text-xs text-[#6B7280] mt-1">Cambios se guardan localmente (este equipo/navegador).</p>
              </div>
              {form.tension && <Badge>{form.tension}</Badge>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input label="Clave enlace" value={form.claveEnlace} onChange={(e) => setForm({ ...form, claveEnlace: e.target.value })} />
            <Input label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />

            <Input label="Área" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Input label="Tensión" value={form.tension} onChange={(e) => setForm({ ...form, tension: e.target.value })} />

            <Input label="Kms" type="number" step="0.01" value={form.kms} onChange={(e) => setForm({ ...form, kms: e.target.value })} />
            <Input label="NC" type="number" step="1" value={form.nc} onChange={(e) => setForm({ ...form, nc: e.target.value })} />

            <Input label="Conductor" value={form.conductor} onChange={(e) => setForm({ ...form, conductor: e.target.value })} />
            <Input label="Tip. Estruc" value={form.tipoEstructura} onChange={(e) => setForm({ ...form, tipoEstructura: e.target.value })} />

            <Input label="# Est" type="number" step="1" value={form.numEstructuras} onChange={(e) => setForm({ ...form, numEstructuras: e.target.value })} />
            <Input label="Año" type="number" step="1" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} />

            <Input label="Comp" value={form.comp} onChange={(e) => setForm({ ...form, comp: e.target.value })} />
            <Input label="Cve SAP" value={form.cveSap} onChange={(e) => setForm({ ...form, cveSap: e.target.value })} />

            <Input label="Brecha" type="number" step="0.01" value={form.brecha} onChange={(e) => setForm({ ...form, brecha: e.target.value })} />
            <Input label="Conf cond" value={form.confCond} onChange={(e) => setForm({ ...form, confCond: e.target.value })} />

            <Input label="POB" value={form.pob} onChange={(e) => setForm({ ...form, pob: e.target.value })} />
            <Input label="ENT" value={form.ent} onChange={(e) => setForm({ ...form, ent: e.target.value })} />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            {!isCreating && (
              <Button variant="secondary" onClick={handleResetRow} icon={<X className="w-4 h-4" />}>
                Restablecer
              </Button>
            )}
            {isCreating && <div />}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={closeEdit}>Cancelar</Button>
              <Button onClick={handleSave}>{isCreating ? 'Crear registro' : 'Guardar cambios'}</Button>
            </div>
          </div>
        </div>
      )}
    </Modal>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <h1 className="page-title">Información Líneas</h1>
          <p className="page-subtitle mt-2">
            {isAdmin
              ? 'Catálogo técnico. Puedes editar registros y los cambios se guardan localmente en este navegador.'
              : 'Catálogo técnico de líneas de transmisión en modo consulta.'}
          </p>
          {!isAdmin && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <Lock className="h-4 w-4" />
              <span>Solo los administradores pueden editar, agregar o eliminar registros.</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={openCreate}
            disabled={!isAdmin}
            className={!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}
            title={!isAdmin ? 'Solo administradores pueden agregar registros' : 'Agregar nuevo registro'}
          >
            Agregar
          </Button>
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={handleExportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-panel px-4 py-4">
          <p className="section-heading">Catálogo</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">{mergedCatalog.length}</p>
          <p className="mt-1 text-sm text-[#64748b]">registros totales disponibles</p>
        </div>
        <div className="surface-panel px-4 py-4">
          <p className="section-heading">Filtrado</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">{filtered.length}</p>
          <p className="mt-1 text-sm text-[#64748b]">registros visibles con la búsqueda actual</p>
        </div>
        <div className="surface-panel px-4 py-4">
          <p className="section-heading">Cambios locales</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">{Object.keys(overrides).length}</p>
          <p className="mt-1 text-sm text-[#64748b]">modificaciones almacenadas en este navegador</p>
        </div>
      </div>

      <div className="surface-panel px-4 py-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
          <Input
            placeholder="Buscar (clave, número, descripción, conductor, SAP, etc.)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-5 h-5" />}
          />
          <div className="surface-muted hidden items-center justify-center px-4 py-3 text-xs text-[#64748b] lg:flex">
            Tip: usa el buscador del header o este buscador para filtrar.
          </div>
        </div>
      </div>

      </div>

      {/* Mobile: cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filtered.map((e) => (
          <div
            key={`${e.claveEnlace}-${e.tipoEstructura}-${e.anio ?? 'na'}`}
            className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{e.claveEnlace}</p>
                <p className="text-xs text-[#6B7280] mt-1">{e.descripcion}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{e.tension}</Badge>
                <button
                  type="button"
                  className={`p-2 rounded-lg border border-[#E5E7EB] ${
                    isAdmin ? 'hover:bg-[#F9FAFB] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  }`}
                  onClick={() => openEdit(e)}
                  aria-label="Editar"
                  disabled={!isAdmin}
                  title={!isAdmin ? 'Solo administradores pueden editar' : 'Editar'}
                >
                  <Pencil className="w-4 h-4 text-[#111827]" />
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-lg border ${
                    isAdmin
                      ? 'border-red-300 bg-white hover:bg-red-50 cursor-pointer'
                      : 'border-[#E5E7EB] bg-gray-50 opacity-40 cursor-not-allowed'
                  } transition-colors`}
                  onClick={() => {
                    if (!isAdmin) {
                      showToast('Solo los administradores pueden eliminar registros', 'error');
                      return;
                    }
                    if (confirm('¿Estás seguro de eliminar este registro localmente? Esta acción no se puede deshacer.')) {
                      const next: OverridesMap = { ...overrides };
                      const foundEntry = LINEAS_CATALOG.find(l => l.claveEnlace === e.claveEnlace);
                      next[e.claveEnlace] = { ...foundEntry, hidden: true };
                      saveOverrides(next);
                      setOverrides(next);
                      showToast('Registro eliminado localmente', 'success');
                    }
                  }}
                  aria-label="Eliminar"
                  title={!isAdmin ? 'Solo administradores pueden eliminar' : 'Eliminar'}
                  disabled={!isAdmin}
                >
                  <Trash2 className={`w-4 h-4 ${isAdmin ? 'text-red-600' : 'text-gray-400'}`} />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-[#6B7280]">Área:</span> <span className="text-[#111827] font-medium">{e.area}</span></div>
              <div><span className="text-[#6B7280]">Kms:</span> <span className="text-[#111827] font-medium">{e.kms ?? 'N/A'}</span></div>
              <div><span className="text-[#6B7280]">Conductor:</span> <span className="text-[#111827] font-medium">{e.conductor}</span></div>
              <div><span className="text-[#6B7280]">Conf:</span> <span className="text-[#111827] font-medium">{e.confCond}</span></div>
              <div><span className="text-[#6B7280]">Tip. Estruc:</span> <span className="text-[#111827] font-medium">{e.tipoEstructura}</span></div>
              <div><span className="text-[#6B7280]"># Est:</span> <span className="text-[#111827] font-medium">{e.numEstructuras ?? 'N/A'}</span></div>
              <div><span className="text-[#6B7280]">Año:</span> <span className="text-[#111827] font-medium">{e.anio ?? 'N/A'}</span></div>
              <div><span className="text-[#6B7280]">Cve SAP:</span> <span className="text-[#111827] font-medium">{e.cveSap}</span></div>
              <div><span className="text-[#6B7280]">Brecha:</span> <span className="text-[#111827] font-medium">{e.brecha ?? 'N/A'}</span></div>
              <div><span className="text-[#6B7280]">NC:</span> <span className="text-[#111827] font-medium">{e.nc ?? 'N/A'}</span></div>
              <div><span className="text-[#6B7280]">POB:</span> <span className="text-[#111827] font-medium">{e.pob}</span></div>
              <div><span className="text-[#6B7280]">ENT:</span> <span className="text-[#111827] font-medium">{e.ent}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="surface-panel hidden overflow-hidden relative md:block">
        {/* Indicadores de scroll lateral */}
        {showLeftShadow && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none z-10" />
        )}
        {showRightShadow && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/5 to-transparent pointer-events-none z-10" />
        )}

        <div
          ref={tableContainerRef}
          className="overflow-x-auto overflow-y-visible"
          style={{ scrollbarWidth: 'thin' }}
        >
          <table className="w-full text-[13px]" style={{ minWidth: '1220px' }}>
            <thead className="sticky top-0 z-[5] bg-white/95 backdrop-blur">
              <tr className="border-b border-[#E5E7EB] text-xs text-[#6B7280]">
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">CLAVE ENLACE</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">DESCRIPCIÓN</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">TENSIÓN</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">KMS</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">CONDUCTOR</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">TIP. ESTRUC</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]"># EST</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">AÑO</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">SAP</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">CONF</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">BRECHA</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">NC</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">POB</th>
                <th className="bg-white px-3 py-3 text-left font-semibold tracking-[0.04em] text-[#64748b]">ENT</th>
                <th className="text-right py-3 px-4 font-semibold bg-white">ACCIONES</th>
              </tr>
            </thead>
            <tbody>
            {filtered.map((e) => (
              <tr key={`${e.claveEnlace}-${e.tipoEstructura}-${e.anio ?? 'na'}`} className="border-b border-[rgba(15,23,42,0.06)] hover:bg-[rgba(15,23,42,0.015)]">
                <td className="sticky left-0 z-[2] whitespace-nowrap bg-white px-3 py-3 font-semibold text-[#0f172a]">{e.claveEnlace}</td>
                <td className="max-w-[240px] px-3 py-3 text-[#0f172a]">{e.descripcion}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]"><Badge>{e.tension}</Badge></td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.kms ?? 'N/A'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.conductor}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.tipoEstructura}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.numEstructuras ?? 'N/A'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.anio ?? 'N/A'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.cveSap}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.confCond}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.brecha ?? 'N/A'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.nc ?? 'N/A'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.pob}</td>
                <td className="whitespace-nowrap px-3 py-3 text-[#334155]">{e.ent}</td>
                <td className="sticky right-0 bg-white px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] ${
                        isAdmin ? 'hover:bg-[#F9FAFB] cursor-pointer' : 'opacity-40 cursor-not-allowed bg-gray-50'
                      }`}
                      onClick={() => openEdit(e)}
                      disabled={!isAdmin}
                      title={!isAdmin ? 'Solo administradores pueden editar' : 'Editar'}
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="text-xs font-medium">Editar</span>
                    </button>
                    <button
                      type="button"
                      className={`p-2 rounded-lg border ${
                        isAdmin
                          ? 'border-red-300 bg-white hover:bg-red-50 cursor-pointer'
                          : 'border-[#E5E7EB] bg-gray-50 opacity-40 cursor-not-allowed'
                      } transition-colors`}
                      onClick={() => {
                        if (!isAdmin) {
                          showToast('Solo los administradores pueden eliminar registros', 'error');
                          return;
                        }
                        if (confirm('¿Estás seguro de eliminar este registro localmente? Esta acción no se puede deshacer.')) {
                          const next: OverridesMap = { ...overrides };
                          const foundEntry = LINEAS_CATALOG.find(l => l.claveEnlace === e.claveEnlace);
                          next[e.claveEnlace] = { ...foundEntry, hidden: true };
                          saveOverrides(next);
                          setOverrides(next);
                          showToast('Registro eliminado localmente', 'success');
                        }
                      }}
                      aria-label="Eliminar"
                      title={!isAdmin ? 'Solo administradores pueden eliminar' : 'Eliminar'}
                      disabled={!isAdmin}
                    >
                      <Trash2 className={`w-4 h-4 ${isAdmin ? 'text-red-600' : 'text-gray-400'}`} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
