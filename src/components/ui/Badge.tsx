import { ReactNode, memo } from 'react';
import clsx from 'clsx';
import { Classification, FaultStatus } from '../../types';

interface BadgeProps {
  children: ReactNode;
  variant?: 'classification' | 'status' | 'default' | 'info' | 'warning' | 'error' | 'success';
  classification?: Classification | 'ALTA' | 'MODERADA' | 'BAJA';
  status?: FaultStatus | 'ABIERTA' | 'EN_ATENCION' | 'CERRADA';
  className?: string;
}

const Badge = memo(function Badge({ children, variant = 'default', classification, status, className }: BadgeProps) {
  const getClassificationColor = (c?: string) => {
    if (!c) return 'bg-slate-100 text-slate-700 border-slate-200';
    const normalized = c.toUpperCase();
    switch (normalized) {
      case 'ALTA':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'MODERADA':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'BAJA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusColor = (s?: string) => {
    if (!s) return 'bg-slate-100 text-slate-700 border-slate-200';
    const normalized = s.toUpperCase().replace(/\s/g, '_');
    switch (normalized) {
      case 'ABIERTA':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'EN_ATENCIÓN':
      case 'EN_ATENCION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CERRADA':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em]',
        {
          [getClassificationColor(classification!)]: variant === 'classification' && classification,
          [getStatusColor(status!)]: variant === 'status' && status,
          'bg-[rgba(21,122,90,0.08)] text-[#0b3d2e] border-[rgba(21,122,90,0.16)]': variant === 'default',
          'bg-blue-50 text-blue-700 border-blue-200': variant === 'info',
          'bg-amber-50 text-amber-700 border-amber-200': variant === 'warning',
          'bg-red-50 text-red-700 border-red-200': variant === 'error',
          'bg-emerald-50 text-emerald-700 border-emerald-200': variant === 'success',
        },
        className
      )}
    >
      {children}
    </span>
  );
});

export default Badge;
