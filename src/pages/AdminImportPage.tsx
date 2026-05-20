import { useState, DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadCloud, CheckCircle, AlertTriangle, XCircle, FileArchive, Map, Workflow, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { importKMZ } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface ImportResult {
  lineas_created: number;
  tramos_inserted: number;
  estructuras_inserted: number;
  lineas_finalized: number;
  errores: string[];
  warnings: string[];
}

export default function AdminImportPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => importKMZ(file),
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['lineas'] });
      queryClient.invalidateQueries({ queryKey: ['estructuras'] });

      const total = data.lineas_created + data.estructuras_inserted;
      if (data.errores.length > 0) {
        showToast(`KMZ importado con ${data.errores.length} errores. ${total} elementos procesados.`, 'info');
      } else {
        showToast(`KMZ importado exitosamente. ${total} elementos procesados.`, 'success');
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      showToast(`Error al importar KMZ: ${errorMessage}`, 'error');
    },
  });

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.kmz') || droppedFile.name.endsWith('.kml'))) {
      setFile(droppedFile);
      setResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = () => {
    if (file) importMutation.mutate(file);
  };

  const summaryCards = result
    ? [
        { label: 'Líneas creadas', value: result.lineas_created, icon: <Map className="h-5 w-5 text-[#157A5A]" /> },
        { label: 'Tramos insertados', value: result.tramos_inserted, icon: <Workflow className="h-5 w-5 text-[#157A5A]" /> },
        { label: 'Estructuras', value: result.estructuras_inserted, icon: <ShieldCheck className="h-5 w-5 text-[#157A5A]" /> },
        { label: 'Líneas finalizadas', value: result.lineas_finalized, icon: <CheckCircle className="h-5 w-5 text-[#157A5A]" /> },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h1 className="page-title">Importar KMZ</h1>
        <p className="page-subtitle mt-2">
          Carga archivos KMZ/KML para incorporar líneas, tramos y estructuras. El flujo está pensado para importaciones controladas y revisión inmediata del resultado.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="p-5 sm:p-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={[
              'rounded-[26px] border-2 border-dashed p-8 text-center transition-all duration-200 sm:p-12',
              isDragging
                ? 'border-[#157A5A] bg-[rgba(21,122,90,0.08)] shadow-[0_20px_40px_rgba(21,122,90,0.12)]'
                : 'border-[rgba(15,23,42,0.08)] bg-[rgba(248,250,249,0.7)] hover:border-[rgba(21,122,90,0.22)] hover:bg-white',
            ].join(' ')}
          >
            <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
                <UploadCloud className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#0f172a]">{file ? file.name : 'Arrastra tu archivo KMZ o KML aquí'}</p>
                <p className="mt-1 text-sm text-[#64748b]">También puedes seleccionarlo manualmente desde tu equipo.</p>
              </div>

              <input type="file" accept=".kmz,.kml" className="hidden" id="file-input" onChange={handleFileChange} />
              <label htmlFor="file-input" className="cursor-pointer">
                <span className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2.5 text-sm font-medium text-[#0f172a] shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5">
                  <FileArchive className="h-4 w-4" />
                  Seleccionar archivo
                </span>
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['Formato', 'Acepta .kmz y .kml'],
              ['Proceso', 'Importa líneas, tramos y estructuras'],
              ['Revisión', 'Muestra advertencias y errores al finalizar'],
            ].map(([title, desc]) => (
              <div key={title} className="surface-muted px-4 py-4">
                <p className="section-heading">{title}</p>
                <p className="mt-2 text-sm font-medium text-[#0f172a]">{desc}</p>
              </div>
            ))}
          </div>

          {file && !importMutation.isPending && !result && (
            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleImport}>Importar archivo</Button>
            </div>
          )}

          {importMutation.isPending && (
            <div className="surface-muted mt-6 px-4 py-4 text-center">
              <p className="text-sm font-medium text-[#0f172a]">Procesando archivo...</p>
              <p className="mt-1 text-sm text-[#64748b]">Validando estructura, geometrías y registros asociados.</p>
            </div>
          )}

          {importMutation.isError && (
            <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Error al importar archivo</p>
                  <p className="mt-1 text-sm text-red-600">
                    {importMutation.error instanceof Error ? importMutation.error.message : 'Error desconocido'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <p className="section-heading">Guía rápida</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#0f172a]">Qué revisar antes de importar</h2>
          <div className="mt-5 space-y-4">
            {[
              ['Archivo origen', 'Verifica que el KMZ/KML corresponda al lote correcto y no contenga capas obsoletas.'],
              ['Consistencia', 'Asegúrate de que nombres, segmentos y estructuras vengan con nomenclatura estable.'],
              ['Lectura del resultado', 'Después de importar, revisa advertencias y errores para identificar registros incompletos.'],
            ].map(([title, desc], index) => (
              <div key={title} className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(21,122,90,0.1)] text-sm font-semibold text-[#157A5A]">{index + 1}</div>
                <div>
                  <p className="text-sm font-semibold text-[#0f172a]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#64748b]">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="premium-divider my-6" />

          <div className="surface-muted px-4 py-4">
            <p className="text-sm font-semibold text-[#0f172a]">Resultado esperado</p>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              El sistema debe reflejar nuevas líneas y estructuras disponibles para consulta en mapa y catálogos, manteniendo el flujo operativo actual.
            </p>
          </div>
        </Card>
      </div>

      {result && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#0f172a]">Resultado de importación</h2>
            <p className="mt-1 text-sm text-[#64748b]">Resumen del procesamiento del archivo cargado.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)]">
                    {card.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">{card.value}</p>
                    <p className="text-xs text-[#64748b]">{card.label}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {result.errores.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-[#0f172a]">Se encontraron {result.errores.length} errores</p>
                  <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                    {result.errores.map((error, idx) => (
                      <li key={idx} className="rounded-2xl bg-white px-3 py-2 text-sm text-[#475569]">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {result.warnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-[#0f172a]">Advertencias</p>
                  <ul className="mt-3 space-y-2">
                    {result.warnings.map((warning, idx) => (
                      <li key={idx} className="rounded-2xl bg-white px-3 py-2 text-sm text-[#475569]">• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
