import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-[rgba(15,23,42,0.48)] backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[30px] border border-white/60 bg-white/95 shadow-[0_36px_100px_rgba(15,23,42,0.2)] backdrop-blur-xl ${sizeClasses[size]}`}
            >
              <div className="flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] px-6 py-5 md:px-7">
                <div>
                  <p className="section-heading">Panel</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#0f172a]">{title}</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl p-2 text-[#64748b] transition-colors hover:bg-[rgba(15,23,42,0.05)] hover:text-[#0f172a]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto px-6 py-6 md:px-7">{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
