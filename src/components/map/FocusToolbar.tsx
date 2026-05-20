import { Eye, PlusCircle, X, Share2 } from 'lucide-react';
import { useState } from 'react';
import Button from '../ui/Button';
import { useMapFocus } from '../../contexts/MapFocusContext';
import { Linea } from '../../lib/supabase';
import ShareModal from '../modals/ShareModal';

interface FocusToolbarProps {
  linea?: Linea;
  onExitFocus: () => void;
}

export default function FocusToolbar({ linea, onExitFocus }: FocusToolbarProps) {
  const { setIsRegisterFaultOpen } = useMapFocus();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const lineaId = linea?.id ?? null;

  return (
    <>
      <div className="absolute left-4 right-4 top-4 z-[1000] rounded-[26px] border border-white/70 bg-white/92 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl lg:left-6 lg:right-6 lg:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#ffe8ff] text-[#d946ef]">
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="section-heading">Modo enfoque</p>
              <p className="mt-1 truncate text-sm font-semibold text-[#0f172a]">
                {linea ? `${linea.numero}${linea.nombre ? ` · ${linea.nombre}` : ''}` : 'Cargando línea...'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={<Share2 className="h-4 w-4" />}
              onClick={() => setIsShareOpen(true)}
              disabled={!lineaId}
              className="hidden sm:inline-flex"
            >
              Compartir
            </Button>

            <Button
              variant="primary"
              icon={<PlusCircle className="h-4 w-4" />}
              onClick={() => setIsRegisterFaultOpen(true)}
              className="hidden sm:inline-flex"
              disabled={!lineaId}
            >
              Registrar falla
            </Button>

            <Button variant="secondary" icon={<X className="h-4 w-4" />} onClick={onExitFocus}>
              Salir de enfoque
            </Button>
          </div>
        </div>
      </div>

      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} lineaId={lineaId} />
    </>
  );
}
