import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, Shield, ChevronLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(formData.email, formData.password);
        navigate('/dashboard/mapa', { state: { fromLogin: true } });
      } else {
        await signUp(formData.email, formData.password);
        showToast('Cuenta creada exitosamente', 'success');
        navigate('/dashboard/mapa', { state: { fromLogin: true } });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error en la autenticación';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(21,122,90,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(11,61,46,0.14),transparent_20%),linear-gradient(180deg,#f7faf8_0%,#eef4f0_100%)] px-4 py-6 sm:px-6">
      <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" />

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1160px] items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(400px,440px)]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55 }} className="hidden lg:block">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-[#0b3d2e] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
                <Shield className="h-4 w-4 text-[#157A5A]" />
                Acceso seguro a la plataforma operativa
              </div>
              <h1 className="mt-6 text-[clamp(3rem,5vw,4.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#0f172a]">Ingreso a Linergy</h1>
              <p className="mt-5 text-lg leading-8 text-[#475569]">
                Interfaz diseñada para operación diaria, consulta geoespacial y gestión de incidencias sin fricción.
              </p>

              <div className="surface-panel mt-8 max-w-[540px] p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A]">
                    <LogIn className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">Sesión orientada a productividad</p>
                    <p className="mt-2 text-sm leading-6 text-[#64748b]">
                      La plataforma privilegia claridad visual, velocidad de navegación y control contextual sobre el mapa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="relative">
            <div className="surface-panel-elevated mx-auto w-full max-w-[440px] overflow-hidden p-2.5 sm:p-3">
              <div className="max-h-[calc(100vh-4.5rem)] overflow-y-auto px-5 pb-4 pt-4 sm:px-5">
                <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(11,61,46,0.98),rgba(21,122,90,0.96))] px-6 py-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                  <p className="section-heading !text-white/70">Acceso</p>
                  <h2 className="mt-2 text-[2rem] font-semibold tracking-[-0.03em]">LINERGY</h2>
                </div>

                <div className="mt-4 mb-4 flex rounded-full border border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.03)] p-1">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${isLogin ? 'bg-white text-[#0f172a] shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-[#64748b]'}`}
                  >
                    Iniciar sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${!isLogin ? 'bg-white text-[#0f172a] shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-[#64748b]'}`}
                  >
                    Crear cuenta
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={isLogin ? 'login' : 'signup'}
                    initial={{ opacity: 0, y: 10, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.985 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="mb-5 text-center">
                      <h2 className="text-[1.95rem] font-semibold tracking-[-0.03em] text-[#0f172a]">
                        {isLogin ? 'Bienvenido de nuevo' : 'Crear cuenta nueva'}
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-[#64748b]">
                        {isLogin ? 'Ingresa tus credenciales para continuar.' : 'Completa el registro para acceder al sistema.'}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        label="Correo electrónico"
                        type="email"
                        placeholder="usuario@linergy.app"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />

                      <Input
                        label="Contraseña"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        icon={isLogin ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                        className="mt-1 w-full"
                        disabled={loading}
                      >
                        {loading ? 'Procesando...' : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
                      </Button>
                    </form>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm font-medium text-[#157A5A] transition-colors hover:text-[#0b3d2e]"
                  >
                    {isLogin ? '¿No tienes cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                  </button>
                </div>

                <div className="premium-divider my-5" />

                <div className="surface-muted px-4 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#64748b]">Administración</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    Los nuevos usuarios se crean con permisos básicos. Para acceso administrativo, solicita habilitación al responsable del sistema.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#475569] transition-colors hover:text-[#0f172a]"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Volver al inicio
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
