import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, FileText, Info, Cable, UploadCloud, LogOut, X, Users, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const menuItems = [
  {
    section: 'Operación',
    items: [
      { to: '/dashboard/mapa', icon: Map, label: 'Mapa', adminOnly: false },
      { to: '/dashboard/reportes', icon: FileText, label: 'Reportes', adminOnly: false },
      { to: '/dashboard/fallas', icon: AlertTriangle, label: 'Fallas', adminOnly: false },
    ],
  },
  {
    section: 'Administración',
    items: [
      { to: '/dashboard/info-lineas', icon: Info, label: 'Información Líneas', adminOnly: false },
      { to: '/dashboard/admin/lineas', icon: Cable, label: 'Líneas', adminOnly: true },
      { to: '/dashboard/admin/importar', icon: UploadCloud, label: 'Importar KMZ', adminOnly: true },
      { to: '/dashboard/admin/usuarios', icon: Users, label: 'Usuarios', adminOnly: true },
    ],
  },
];

function DesktopRail() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // noop
    }
    navigate('/', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[92px] border-r border-[rgba(15,23,42,0.06)] bg-white/78 backdrop-blur-2xl md:flex md:flex-col">
      <div className="flex justify-center border-b border-[rgba(15,23,42,0.06)] px-3 py-4">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
          <img src="/logo_web.png" alt="Linergy" className="h-full w-full object-contain" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-3">
          {menuItems.map((section) => {
            const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.section} className="space-y-3">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      clsx(
                        'group flex h-14 items-center justify-center rounded-[22px] transition-all duration-200',
                        isActive
                          ? 'bg-[linear-gradient(180deg,rgba(21,122,90,0.14),rgba(21,122,90,0.08))] shadow-[0_14px_32px_rgba(21,122,90,0.12)]'
                          : 'hover:bg-white hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <div className={clsx(
                        'flex h-10 w-10 items-center justify-center rounded-2xl transition-colors',
                        isActive ? 'bg-white/80 text-[#157A5A]' : 'bg-[rgba(15,23,42,0.04)] text-[#64748b] group-hover:bg-[rgba(21,122,90,0.08)] group-hover:text-[#157A5A]'
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                    )}
                  </NavLink>
                ))}
                <div className="mx-auto h-px w-8 bg-[rgba(15,23,42,0.08)] last:hidden" />
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-[rgba(15,23,42,0.06)] px-3 py-4">
        <button
          type="button"
          onClick={handleLogout}
          title="Salir del sistema"
          className="group flex h-14 w-full items-center justify-center rounded-[22px] transition-all hover:bg-red-50"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <LogOut className="h-4 w-4" />
          </div>
        </button>
      </div>
    </aside>
  );
}

function MobileSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // noop
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.94))]">
      <div className="border-b border-[rgba(15,23,42,0.06)] px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
            <img src="/logo_web.png" alt="Linergy" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-[-0.02em] text-[#0f172a]">Linergy</h1>
            <p className="mt-0.5 text-xs text-[#64748b]">Control operativo de subtransmisión</p>
          </div>
        </div>

        <div className="surface-muted mt-4 flex items-center gap-3 px-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
            <Info className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#0f172a]">{profile?.email ?? 'Sesión activa'}</p>
            <p className="text-xs text-[#64748b]">{isAdmin ? 'Acceso administrativo' : 'Acceso de consulta'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {menuItems.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.section} className="mb-6">
              <p className="section-heading mb-3 px-3">{section.section}</p>
              <div className="space-y-1.5">
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all duration-200',
                        isActive
                          ? 'bg-[linear-gradient(180deg,rgba(21,122,90,0.14),rgba(21,122,90,0.08))] text-[#0b3d2e] shadow-[0_14px_32px_rgba(21,122,90,0.12)]'
                          : 'text-[#475569] hover:bg-white hover:text-[#0f172a] hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-2xl transition-colors',
                          isActive ? 'bg-white/80 text-[#157A5A]' : 'bg-[rgba(15,23,42,0.04)] text-[#64748b] group-hover:bg-[rgba(21,122,90,0.08)] group-hover:text-[#157A5A]'
                        )}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="truncate font-medium">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[rgba(15,23,42,0.06)] p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-red-600 transition-all hover:bg-red-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50">
            <LogOut className="h-4 w-4" />
          </div>
          <span>Salir del sistema</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      <DesktopRail />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-[rgba(15,23,42,0.35)] backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              className="fixed left-0 top-0 z-50 h-screen w-[min(88vw,340px)] border-r border-[rgba(15,23,42,0.08)] bg-white/95 shadow-[0_28px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl md:hidden"
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: 'tween', duration: 0.22 }}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-4 py-4">
                  <div>
                    <p className="section-heading">Navegación</p>
                    <p className="mt-1 text-sm font-medium text-[#0f172a]">Panel principal</p>
                  </div>
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="rounded-2xl p-2 text-[#64748b] transition-colors hover:bg-[rgba(15,23,42,0.05)]"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <MobileSidebarContent onNavigate={onCloseMobile} />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
