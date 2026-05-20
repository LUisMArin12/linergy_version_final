// src/components/map/DetailPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink, Navigation, Crosshair, CreditCard as Edit2, Trash2, CheckCircle, Share2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  Estructura,
  Falla,
  supabase,
  parseGeometry,
  setFallaEstado,
  deleteFalla,
} from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import EditFaultModal from '../modals/EditFaultModal';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';
import ShareModal from '../modals/ShareModal';
import { getFaultStructureReference } from '../../lib/structureReference';

interface DetailPanelProps {
  item: Estructura | Falla | null;
  type: 'estructura' | 'falla' | null;
  estructurasReferencia?: Estructura[];
  onClose: () => void;
  onCenterMap?: (lat: number, lon: number) => void;
}

const estadoLabel: Record<string, string> = {
  ABIERTA: 'Abierta',
  EN_ATENCION: 'En atención',
  CERRADA: 'Cerrada',
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidLatLon(lat: unknown, lon: unknown): lat is number {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export default function DetailPanel({ item, type, estructurasReferencia = [], onClose, onCenterMap }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const isReady = !!item && !!type;

  const isEstructura = type === 'estructura';
  const estructura = isEstructura ? (item as Estructura) : null;
  const falla = !isEstructura ? (item as Falla) : null;

  const lineaId = isEstructura ? estructura?.linea_id : falla?.linea_id;

  const { data: linea } = useQuery({
    queryKey: ['linea', lineaId],
    queryFn: async () => {
      if (!lineaId) return null;

      const { data, error } = await supabase.from('lineas').select('*').eq('id', lineaId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!lineaId,
  });

  // --- Coordenadas robustas ---
  const geom = useMemo(() => parseGeometry(item?.geom ?? null), [item?.geom]);

  // Nunca default a 0,0. Si no hay Point válido => null.
  const coords = geom?.type === 'Point' ? geom.coordinates : null;

  const latRaw = coords ? coords[1] : null; // GeoJSON: [lon, lat]
  const lonRaw = coords ? coords[0] : null;

  const hasValidCoords = isValidLatLon(latRaw, lonRaw);
  const lat: number | null = hasValidCoords ? latRaw : null;
  const lon: number | null = hasValidCoords ? lonRaw : null;

  const coordsText = lat !== null && lon !== null ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'N/A';

  const openInGoogleMaps = () => {
    if (lat === null || lon === null) {
      showToast('Ubicación no disponible: la geometría no tiene coordenadas válidas.', 'error');
      return;
    }
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, '_blank');
  };

  const navigateInGoogleMaps = () => {
    if (lat === null || lon === null) {
      showToast('Ubicación no disponible: la geometría no tiene coordenadas válidas.', 'error');
      return;
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
  };

  const handleCenterMap = () => {
    if (!onCenterMap) return;
    if (lat === null || lon === null) {
      showToast('No se puede centrar: no hay coordenadas válidas.', 'error');
      return;
    }
    onCenterMap(lat, lon);
  };

  // --- Mutations ---
  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: 'ABIERTA' | 'EN_ATENCION' | 'CERRADA') => {
      if (!falla) return;
      await setFallaEstado(falla.id, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fallas'] });
      showToast('Estado actualizado correctamente', 'success');
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al actualizar el estado';
      showToast(msg, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!falla) return;
      await deleteFalla(falla.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fallas'] });
      queryClient.invalidateQueries({ queryKey: ['fallas_reports'] });
      showToast('Falla eliminada correctamente', 'success');
      onClose();
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Error al eliminar la falla';
      showToast(msg, 'error');
    },
  });

  const handleChangeStatus = () => {
    if (!falla) return;

    const statusFlow: Record<string, 'ABIERTA' | 'EN_ATENCION' | 'CERRADA'> = {
      ABIERTA: 'EN_ATENCION',
      EN_ATENCION: 'CERRADA',
      CERRADA: 'ABIERTA',
    };

    const newStatus = statusFlow[falla.estado];
    changeStatusMutation.mutate(newStatus);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteModal(false);
  };

  // ✅ opcional: cuando cambie item, cierra modales secundarios
  useEffect(() => {
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowShareModal(false);
  }, [item?.id, type]);

  const estructuraReferencia = useMemo(
    () => (falla ? getFaultStructureReference(falla, estructurasReferencia) : null),
    [falla, estructurasReferencia]
  );

  if (!isReady) return null;

  const statusCta =
    falla?.estado === 'ABIERTA'
      ? 'Marcar en atención'
      : falla?.estado === 'EN_ATENCION'
      ? 'Marcar como cerrada'
      : 'Reabrir falla';

  const statusLabel = falla ? estadoLabel[falla.estado] || falla.estado : '';

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed top-0 right-0 z-[1000] h-screen w-full overflow-y-auto border-l border-white/70 bg-white/94 shadow-[0_28px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:w-[26rem]"
      >
        <div className="p-6 md:p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="section-heading !tracking-[0.18em] mb-1">{isEstructura ? 'Estructura' : 'Falla'}</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#0f172a]">
                {isEstructura ? estructura!.numero_estructura : falla!.tipo}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowShareModal(true)}
                className="rounded-2xl p-2 transition-colors hover:bg-[rgba(15,23,42,0.05)]"
                aria-label="Compartir"
                title="Compartir"
              >
                <Share2 className="w-5 h-5 text-[#6B7280]" />
              </button>

              <button
                onClick={onClose}
                className="rounded-2xl p-2 transition-colors hover:bg-[rgba(15,23,42,0.05)]"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X className="w-5 h-5 text-[#6B7280]" />
              </button>
            </div>
          </div>

          {isEstructura && estructura && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Línea</p>
                  <p className="font-semibold text-[#111827]">{linea?.numero || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Kilómetro</p>
                  <p className="font-semibold text-[#111827]">{estructura.km.toFixed(1)} km</p>
                </div>

                {linea && (
                  <div>
                    <p className="text-xs text-[#6B7280] mb-1">Clasificación</p>
                    <Badge variant="classification" classification={linea.clasificacion}>
                      {linea.clasificacion}
                    </Badge>
                  </div>
                )}

                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Coordenadas</p>
                  <p className="text-xs font-mono text-[#111827]">{coordsText}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-[rgba(15,23,42,0.06)] pt-4">
                <Button
                  variant="secondary"
                  icon={<Crosshair className="w-4 h-4" />}
                  className="w-full"
                  onClick={handleCenterMap}
                  disabled={!hasValidCoords}
                >
                  Centrar en mapa
                </Button>

                <Button
                  variant="secondary"
                  icon={<ExternalLink className="w-4 h-4" />}
                  onClick={openInGoogleMaps}
                  className="w-full"
                  disabled={!hasValidCoords}
                >
                  Ver en Google Maps
                </Button>
              </div>
            </div>
          )}

          {!isEstructura && falla && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Línea</p>
                  <p className="font-semibold text-[#111827]">{linea?.numero || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Kilómetro</p>
                  <p className="font-semibold text-[#111827]">{falla.km.toFixed(1)} km</p>
                </div>

                <div className="col-span-2 rounded-2xl border border-[rgba(21,122,90,0.14)] bg-[rgba(21,122,90,0.06)] px-4 py-3">
                  <p className="text-xs text-[#157A5A] mb-1">Estructura(s) de referencia</p>
                  <p className="font-semibold text-[#0f172a]">{estructuraReferencia?.label ?? 'N/A'}</p>
                  {estructuraReferencia?.detail && (
                    <p className="mt-1 text-xs text-[#64748b]">{estructuraReferencia.detail}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Estado</p>
                  <Badge variant="status" status={falla.estado}>
                    {statusLabel}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Tipo</p>
                  <p className="font-semibold text-[#111827]">{falla.tipo}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-[#6B7280] mb-1">Fecha y hora</p>
                <p className="font-semibold text-[#111827]">
                  {new Date(falla.ocurrencia_ts).toLocaleDateString('es-ES')} •{' '}
                  {new Date(falla.ocurrencia_ts).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {falla.descripcion && (
                <div>
                  <p className="text-xs text-[#6B7280] mb-1">Descripción</p>
                  <p className="text-sm text-[#111827]">{falla.descripcion}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-[#6B7280] mb-1">Coordenadas</p>
                <p className="text-xs font-mono text-[#111827]">{coordsText}</p>
              </div>

              <div className="space-y-2 border-t border-[rgba(15,23,42,0.06)] pt-4">
                <Button
                  variant="secondary"
                  icon={<Crosshair className="w-4 h-4" />}
                  onClick={handleCenterMap}
                  className="w-full"
                  disabled={lat === null || lon === null}
                >
                  Centrar en mapa
                </Button>

                {isAdmin && (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        icon={<Edit2 className="w-4 h-4" />}
                        onClick={() => setShowEditModal(true)}
                        className="flex-1"
                      >
                        Editar falla
                      </Button>

                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-3 rounded-lg border border-red-300 bg-white hover:bg-red-50 transition-colors"
                        aria-label="Eliminar falla"
                        title="Eliminar falla"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>

                    <Button
                      variant="secondary"
                      icon={<CheckCircle className="w-4 h-4" />}
                      onClick={handleChangeStatus}
                      className="w-full"
                      disabled={changeStatusMutation.isPending}
                    >
                      {changeStatusMutation.isPending ? 'Actualizando...' : statusCta}
                    </Button>
                  </>
                )}

                <Button
                  variant="secondary"
                  icon={<ExternalLink className="w-4 h-4" />}
                  onClick={openInGoogleMaps}
                  className="w-full"
                  disabled={!hasValidCoords}
                >
                  Ver en Google Maps
                </Button>

                <Button
                  variant="secondary"
                  icon={<Navigation className="w-4 h-4" />}
                  onClick={navigateInGoogleMaps}
                  className="w-full"
                  disabled={!hasValidCoords}
                >
                  Navegar
                </Button>
              </div>
            </div>
          )}
        </div>

        {falla && showEditModal && (
          <EditFaultModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} falla={falla} />
        )}

        {falla && (
          <ConfirmDeleteModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={handleDelete}
            title="Eliminar falla"
            message="¿Estás seguro de que deseas eliminar esta falla? Esta acción no se puede deshacer."
            isDeleting={deleteMutation.isPending}
          />
        )}
      </motion.div>

      {/* ✅ Share modal: preserva state/params y fuerza lineId/faultId */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        lineaId={lineaId || null}
        fallaId={falla?.id || null}
      />
    </>
  );
}