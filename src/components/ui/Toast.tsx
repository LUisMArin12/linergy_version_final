import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts?: ToastMessage[];
  onRemove?: (id: string) => void;
  duration?: number;
  message?: string;
  type?: ToastType;
  isVisible?: boolean;
  onClose?: () => void;
}

function ToastItem({
  id,
  message,
  type,
  onRemove,
  duration = 2000
}: ToastMessage & { onRemove: (id: string) => void; duration?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(id), duration);
    return () => clearTimeout(timer);
  }, [id, onRemove, duration]);

  const iconConfig = {
    success: {
      icon: <CheckCircle className="w-5 h-5" strokeWidth={2.5} />,
      bg: 'bg-emerald-500',
      text: 'text-white',
      ring: 'ring-emerald-500/20',
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" strokeWidth={2.5} />,
      bg: 'bg-rose-500',
      text: 'text-white',
      ring: 'ring-rose-500/20',
    },
    info: {
      icon: <Info className="w-5 h-5" strokeWidth={2.5} />,
      bg: 'bg-sky-500',
      text: 'text-white',
      ring: 'ring-sky-500/20',
    },
  };

  const config = iconConfig[type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, x: 100 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
        mass: 0.5
      }}
      className="w-full max-w-md"
    >
      <div
        className={clsx(
          'flex items-center gap-3.5 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md ring-4',
          config.bg,
          config.text,
          config.ring
        )}
        style={{
          boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        <div className="flex-shrink-0 bg-white/20 rounded-full p-1.5">
          {config.icon}
        </div>
        <p className="text-sm font-semibold leading-relaxed flex-1 min-w-0 pr-2">
          {message}
        </p>
        <button
          onClick={() => onRemove(id)}
          className="flex-shrink-0 p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200 active:scale-95"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>
    </motion.div>
  );
}

export default function Toast({ toasts, onRemove, duration, message, type = 'info', isVisible, onClose }: ToastProps) {
  const normalizedToasts = toasts ?? (isVisible && message ? [{ id: 'single-toast', message, type }] : []);
  const handleRemove = onRemove ?? (() => onClose?.());

  if (!normalizedToasts || normalizedToasts.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto"
          onClick={() => normalizedToasts.forEach(toast => handleRemove(toast.id))}
        />

        <div className="relative z-10 flex flex-col items-center gap-3 w-full max-w-md pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {normalizedToasts.map((toast) => (
              <ToastItem
                key={toast.id}
                id={toast.id}
                message={toast.message}
                type={toast.type}
                onRemove={handleRemove}
                duration={duration}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </AnimatePresence>
  );
}
