import { motion } from 'framer-motion';
import { ArrowRight, Zap, Shield, MapPin, Activity, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function WelcomePage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <MapPin className="h-5 w-5" />,
      title: 'Mapa operativo',
      description: 'Visualización clara de líneas, estructuras y eventos críticos en un solo flujo.',
    },
    {
      icon: <Activity className="h-5 w-5" />,
      title: 'Gestión de fallas',
      description: 'Registro, atención y seguimiento con contexto geoespacial y trazabilidad.',
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Control confiable',
      description: 'Interfaz robusta para operación diaria, supervisión y administración.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(21,122,90,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(11,61,46,0.15),transparent_22%),linear-gradient(180deg,#f7faf8_0%,#eef4f0_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-30" />
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1240px] items-center">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex min-w-0 flex-col justify-center"
          >
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-[#0b3d2e] shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[#157A5A]" />
              Plataforma operativa geoespacial
            </div>

            <div className="mt-6 max-w-[640px]">
              <p className="section-heading">Producto digital</p>
              <h1 className="mt-3 text-[clamp(2.9rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#0f172a]">
                LINERGY
              </h1>
              <p className="mt-4 max-w-[640px] text-[clamp(1.05rem,1.8vw,1.4rem)] font-medium leading-8 text-[#157A5A]">
                Sistema de gestión de líneas de subtransmisión con enfoque operativo, visual y geoespacial.
              </p>
              <p className="mt-5 max-w-[560px] text-base leading-7 text-[#475569] sm:text-lg">
                Diseñado para que supervisión, consulta y registro de incidencias se sientan precisos, rápidos y confiables desde el primer uso.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button variant="primary" size="lg" icon={<ArrowRight className="h-5 w-5" />} onClick={() => navigate('/login')} className="sm:min-w-[220px]">
                Acceder al sistema
              </Button>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.08, duration: 0.5 }}
                  className="surface-panel min-w-0 p-5"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(21,122,90,0.1)] text-[#157A5A] shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-[#0f172a]">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="relative z-10 mx-auto w-full max-w-[520px]"
          >
            <div className="absolute -left-6 top-6 h-24 w-24 rounded-full bg-[rgba(21,122,90,0.18)] blur-3xl" />
            <div className="absolute -bottom-4 right-0 h-32 w-32 rounded-full bg-[rgba(11,61,46,0.18)] blur-3xl" />

            <div className="surface-panel-elevated overflow-hidden p-4 sm:p-5">
              <div className="rounded-[24px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                <img
                  src="/logo_web.png"
                  alt="Vista del sistema Linergy"
                  className="h-auto max-h-[470px] w-full rounded-[20px] border border-[rgba(15,23,42,0.06)] object-cover shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="surface-muted px-4 py-4">
                  <p className="section-heading">Cobertura</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">~1,000 km</p>
                  <p className="mt-1 text-sm text-[#64748b]">de líneas de subtransmisión bajo gestión operativa.</p>
                </div>
                <div className="surface-muted px-4 py-4">
                  <p className="section-heading">Experiencia</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-[#0f172a]">
                    <Zap className="h-4 w-4 text-[#157A5A]" />
                    Interfaz clara, rápida y orientada a decisión.
                  </p>
                  <p className="mt-2 text-sm text-[#64748b]">Diseño enfocado en visibilidad, foco operativo y baja fricción.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
