import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Download, Calendar, User, Activity } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const actionLabels: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Inicio de sesión',
  LOGOUT: 'Cierre de sesión',
  VIEW: 'Ver',
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-purple-100 text-purple-700',
  LOGOUT: 'bg-gray-100 text-gray-700',
  VIEW: 'bg-yellow-100 text-yellow-700',
};

export default function AdminAuditPage() {
  const { showToast } = useToast();
  const { isAdmin, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['audit_users'],
    queryFn: async () => {
      if (!isAdmin) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, email')
        .order('nombre');
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ['audit_logs', profile?.id, isAdmin],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_audit_logs', {
        p_user_id: isAdmin ? null : profile?.id || null,
        p_start_date: null,
        p_end_date: null,
        p_entity_type: null,
      });
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
  });

  const filteredLogs = useMemo(() => {
    let filtered = allLogs;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.user_email?.toLowerCase() || '').includes(query) ||
          (log.user_name?.toLowerCase() || '').includes(query) ||
          log.entity_type.toLowerCase().includes(query)
      );
    }

    if (selectedUser) {
      filtered = filtered.filter((log) => log.user_id === selectedUser);
    }

    if (selectedAction) {
      filtered = filtered.filter((log) => log.action === selectedAction);
    }

    if (selectedEntityType) {
      filtered = filtered.filter((log) => log.entity_type === selectedEntityType);
    }

    if (dateFrom) {
      filtered = filtered.filter((log) => new Date(log.created_at) >= new Date(dateFrom));
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => new Date(log.created_at) <= toDate);
    }

    return filtered;
  }, [allLogs, searchTerm, selectedUser, selectedAction, selectedEntityType, dateFrom, dateTo]);

  const handleExportCSV = () => {
    const headers = ['Fecha/Hora', 'Usuario', 'Email', 'Acción', 'Tipo de Entidad', 'ID Entidad'];
    const rows = filteredLogs.map((log) => [
      new Date(log.created_at).toLocaleString('es-MX'),
      log.user_name || 'N/A',
      log.user_email || 'N/A',
      actionLabels[log.action] || log.action,
      log.entity_type,
      log.entity_id || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Reporte exportado correctamente', 'success');
  };


  const clearFilters = () => {
    setSearchTerm('');
    setSelectedUser('');
    setSelectedAction('');
    setSelectedEntityType('');
    setDateFrom('');
    setDateTo('');
  };

  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (selectedUser ? 1 : 0) +
    (selectedAction ? 1 : 0) +
    (selectedEntityType ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const entityTypes = Array.from(new Set(allLogs.map((log) => log.entity_type)));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">
            {isAdmin ? 'Auditoría del Sistema' : 'Mi Actividad'}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {isAdmin
              ? 'Historial completo de actividades y acciones de usuarios'
              : 'Historial de tus actividades en el sistema'}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters((v) => !v)}
          >
            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Exportar CSV
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input
              label="Buscar"
              icon={<Search className="w-4 h-4" />}
              placeholder="Buscar en acciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {isAdmin && (
              <Select
                label="Usuario"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                options={[
                  { value: '', label: 'Todos los usuarios' },
                  ...users.map((u) => ({
                    value: u.id,
                    label: `${u.nombre || u.email}`,
                  })),
                ]}
              />
            )}

            <Select
              label="Acción"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              options={[
                { value: '', label: 'Todas las acciones' },
                ...Object.entries(actionLabels).map(([value, label]) => ({ value, label })),
              ]}
            />

            <Select
              label="Tipo de Entidad"
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              options={[
                { value: '', label: 'Todos los tipos' },
                ...entityTypes.map((type) => ({ value: type, label: type })),
              ]}
            />

            <Input
              label="Fecha desde"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />

            <Input
              label="Fecha hasta"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              icon={<Calendar className="w-4 h-4" />}
            />
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4">
              <Button variant="secondary" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </Card>
      )}

      {isLoading ? (
        <Card className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#157A5A] mx-auto mb-4" />
          <p className="text-[#6B7280]">Cargando registros de auditoría...</p>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <Card className="p-12 text-center">
          <Activity className="w-12 h-12 text-[#6B7280] mx-auto mb-4" />
          <p className="text-[#6B7280]">
            {activeFiltersCount > 0
              ? 'No se encontraron registros con los filtros aplicados'
              : 'No hay registros de auditoría'}
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#E5E7EB]">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Acción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#6B7280] uppercase tracking-wider">
                      Detalles
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E5E7EB]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#111827]">
                        {new Date(log.created_at).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-[#DDF3EA] rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-[#157A5A]" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-[#111827]">
                              {log.user_name || 'Usuario desconocido'}
                            </div>
                            <div className="text-xs text-[#6B7280]">{log.user_email || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            actionColors[log.action] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {actionLabels[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6B7280]">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">
                        <div className="max-w-xs truncate">
                          {log.details && Object.keys(log.details).length > 0
                            ? JSON.stringify(log.details)
                            : 'Sin detalles'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7280]">
              Mostrando {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
