import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, User, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../contexts/ToastContext';
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal';
import { useDragScroll } from '../hooks/useDragScroll';

type UserWithProfile = {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  last_sign_in_at: string | null;
};

export default function AdminUsersPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [roleChanges, setRoleChanges] = useState<Record<string, 'admin' | 'user'>>({});
  const [userToDelete, setUserToDelete] = useState<UserWithProfile | null>(null);
  const tableRef = useDragScroll<HTMLDivElement>();

  const { data: users, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_users_with_profiles');
      if (error) throw error;
      return data as UserWithProfile[];
    },
    retry: false,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'user' }) => {
      const { error } = await supabase.rpc('update_user_role', { user_id: userId, new_role: newRole });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setRoleChanges((prev) => {
        const next = { ...prev };
        delete next[variables.userId];
        return next;
      });
      showToast('Rol actualizado correctamente', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message || 'Error al actualizar rol', 'error');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('delete_user', { user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      showToast('Usuario eliminado correctamente', 'success');
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      showToast(error.message || 'Error al eliminar usuario', 'error');
    },
  });

  const handleRoleChange = (userId: string, newRole: 'admin' | 'user') => {
    setRoleChanges((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = (userId: string) => {
    const newRole = roleChanges[userId];
    if (newRole) updateRoleMutation.mutate({ userId, newRole });
  };

  const hasChanges = (userId: string, currentRole: string) => !!roleChanges[userId] && roleChanges[userId] !== currentRole;

  const handleConfirmDelete = () => {
    if (userToDelete) deleteUserMutation.mutate(userToDelete.id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="surface-panel px-8 py-8 text-center">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#157A5A]" />
          <p className="mt-3 text-sm text-[#64748b]">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p className="mb-2 font-semibold">Error al cargar usuarios</p>
            <p className="text-sm">{error instanceof Error ? error.message : String(error)}</p>
            <Button onClick={() => refetch()} className="mt-4">Reintentar</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
            <Users className="h-6 w-6" />
          </div>
          <h1 className="page-title">Administración de Usuarios</h1>
        </div>
        <p className="page-subtitle">Gestiona roles y permisos del sistema con una interacción más clara y controlada.</p>
      </div>

      <Card className="overflow-hidden">
        <div ref={tableRef} className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-[rgba(15,23,42,0.06)] bg-[rgba(15,23,42,0.03)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Usuario</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Fecha de Registro</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Último Acceso</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[#64748b]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.06)] bg-white">
              {users?.map((user) => {
                const pendingRole = roleChanges[user.id] || user.role;
                return (
                  <tr key={user.id} className="hover:bg-[rgba(15,23,42,0.015)]">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#0f172a]">{user.email}</div>
                          <div className="text-xs text-[#64748b]">{user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex rounded-full border border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.03)] p-1">
                          <button
                            type="button"
                            onClick={() => handleRoleChange(user.id, 'user')}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${pendingRole === 'user' ? 'bg-white text-[#0f172a] shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-[#64748b]'}`}
                          >
                            Usuario
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoleChange(user.id, 'admin')}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${pendingRole === 'admin' ? 'bg-white text-[#0f172a] shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-[#64748b]'}`}
                          >
                            Administrador
                          </button>
                        </div>
                        {pendingRole === 'admin' && !hasChanges(user.id, user.role) && <Shield className="h-4 w-4 text-amber-500" />}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[#64748b]">{formatDate(user.created_at)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[#64748b]">{formatDate(user.last_sign_in_at)}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        {hasChanges(user.id, user.role) ? (
                          <Button size="sm" onClick={() => handleSaveRole(user.id)} disabled={updateRoleMutation.isPending}>
                            {updateRoleMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Guardar'}
                          </Button>
                        ) : (
                          <Badge variant={user.role === 'admin' ? 'warning' : 'info'}>
                            {user.role === 'admin' ? 'Admin' : 'Usuario'}
                          </Badge>
                        )}
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="rounded-2xl p-2 transition-colors hover:bg-red-50"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users && users.length === 0 && (
          <div className="py-12 text-center text-[#64748b]">
            <Users className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>No hay usuarios registrados</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#0f172a]">Información sobre Roles</h2>
        <div className="space-y-3 text-sm text-[#64748b]">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
            <div>
              <span className="font-semibold text-[#0f172a]">Administrador:</span> Acceso completo al sistema, puede gestionar usuarios, importar datos, editar y eliminar fallas.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#157A5A]" />
            <div>
              <span className="font-semibold text-[#0f172a]">Usuario:</span> Puede ver el mapa, reportar fallas y consultar información, pero no puede eliminar o editar datos existentes.
            </div>
          </div>
        </div>
      </Card>

      <ConfirmDeleteModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario ${userToDelete?.email}? Esta acción no se puede deshacer y eliminará todos los datos asociados.`}
        isDeleting={deleteUserMutation.isPending}
      />
    </div>
  );
}
