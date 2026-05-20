import { useEffect, useState } from 'react';
import { Search, PlusCircle, Share2, Menu, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { useMapFocus } from '../../contexts/MapFocusContext';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  onShare: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Header({ onOpenMobileSidebar, onShare, searchQuery, onSearchChange }: HeaderProps) {
  const { setIsRegisterFaultOpen } = useMapFocus();
  const [draft, setDraft] = useState(searchQuery);

  useEffect(() => {
    if (draft === '') setDraft(searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const submitSearch = () => {
    const q = draft.trim();
    onSearchChange(q);
    setDraft('');
  };

  return (
    <header className="sticky top-0 z-20 px-4 pt-4 sm:px-6">
      <div className="surface-panel-elevated mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 xl:flex-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMobileSidebar}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/90 text-[#475569] shadow-[0_8px_22px_rgba(15,23,42,0.06)] transition-colors hover:bg-white md:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <p className="section-heading">Centro de operación</p>
                <p className="mt-1 text-sm text-[#475569]">Búsqueda rápida de líneas y fallas</p>
              </div>
            </div>

            <div className="relative xl:max-w-2xl xl:flex-1">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748b]">
                <Search className="h-5 w-5" />
              </div>

              <input
                type="text"
                placeholder="Buscar línea, km, tipo de falla o descripción..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitSearch();
                  }
                }}
                className="h-12 w-full rounded-[22px] border border-[rgba(15,23,42,0.08)] bg-white pl-12 pr-28 text-sm text-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_25px_rgba(15,23,42,0.05)] outline-none transition-all placeholder:text-[#94a3b8] focus:border-transparent focus:ring-2 focus:ring-[rgba(21,122,90,0.24)]"
                aria-label="Buscar"
              />

              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-2">
                {searchQuery.trim() !== '' && draft === '' && (
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="hidden rounded-full bg-[rgba(15,23,42,0.04)] px-3 py-1 text-xs font-medium text-[#475569] transition-colors hover:bg-[rgba(15,23,42,0.08)] sm:inline-flex"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={submitSearch}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--brand)] px-4 text-sm font-medium text-white shadow-[0_10px_24px_rgba(21,122,90,0.22)] transition-transform hover:-translate-y-0.5"
                  aria-label="Ejecutar búsqueda"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Buscar</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <Button variant="primary" icon={<PlusCircle className="h-4 w-4" />} onClick={() => setIsRegisterFaultOpen(true)} className="flex-1 sm:flex-none">
              Registrar
            </Button>
            <Button variant="secondary" icon={<Share2 className="h-4 w-4" />} onClick={onShare} className="hidden sm:inline-flex">
              Compartir
            </Button>
          </div>
        </div>

        {draft === '' && searchQuery.trim() !== '' && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[rgba(15,23,42,0.06)] pt-3">
            <span className="section-heading">Filtro activo</span>
            <span className="inline-flex max-w-full items-center rounded-full bg-[rgba(21,122,90,0.08)] px-3 py-1 text-xs font-semibold text-[#0b3d2e]">
              <span className="truncate">{searchQuery}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
