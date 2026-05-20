import { useState } from 'react';
import { Info, X } from 'lucide-react';

export default function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] lg:bottom-6 lg:left-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/92 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
        aria-label={open ? 'Ocultar simbología' : 'Mostrar simbología'}
        title={open ? 'Ocultar simbología' : 'Mostrar simbología'}
      >
        <Info className="h-5 w-5 text-[#475569]" />
      </button>

      {open && (
        <div className="pointer-events-auto mt-2 w-[min(82vw,260px)] overflow-hidden rounded-[24px] border border-white/70 bg-white/94 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-4 py-3">
            <div>
              <p className="section-heading">Referencia</p>
              <h3 className="mt-1 text-sm font-semibold text-[#0f172a]">Simbología</h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-2xl p-1.5 transition-colors hover:bg-[rgba(15,23,42,0.05)]"
              aria-label="Cerrar simbología"
            >
              <X className="h-4 w-4 text-[#64748b]" />
            </button>
          </div>

          <div className="space-y-4 p-4 text-sm text-[#0f172a]">
            <div>
              <p className="section-heading mb-2 block">Infraestructura</p>
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-[#ff00ff]" />
                <span className="text-xs">Línea enfocada</span>
              </div>
            </div>

            <div className="border-t border-[rgba(15,23,42,0.06)] pt-4">
              <p className="section-heading mb-2 block">Fallas</p>
              {[
                ['#EF4444', 'Abierta'],
                ['#F59E0B', 'En atención'],
                ['#10B981', 'Cerrada'],
              ].map(([color, label]) => (
                <div key={label} className="mb-2 flex items-center gap-2 last:mb-0">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(15,23,42,0.08)]" style={{ background: color }} />
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
