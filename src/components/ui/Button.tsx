import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses = {
  primary:
    'bg-gradient-to-b from-[#1a8e67] to-[#157A5A] text-white shadow-[0_14px_30px_rgba(21,122,90,0.24)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(21,122,90,0.3)]',
  secondary:
    'border border-[rgba(15,23,42,0.08)] bg-white/90 text-[#0f172a] shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:bg-white hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]',
  ghost:
    'bg-transparent text-[#334155] hover:bg-[rgba(15,23,42,0.05)] hover:text-[#0f172a]',
  danger:
    'bg-gradient-to-b from-[#ef4444] to-[#dc2626] text-white shadow-[0_14px_30px_rgba(220,38,38,0.18)] hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(220,38,38,0.22)]',
} as const;

const sizeClasses = {
  sm: 'px-3.5 py-2 text-sm min-h-[40px]',
  md: 'px-[18px] py-2.5 text-sm min-h-[44px]',
  lg: 'px-6 py-3 text-base min-h-[50px]',
} as const;

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'group inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-all duration-200 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(21,122,90,0.35)] focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0',
        'active:translate-y-[1px] select-none whitespace-nowrap',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && (
        <span className="inline-flex shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
          {icon}
        </span>
      )}
      <span className="inline-flex items-center leading-none">{children}</span>
    </button>
  );
}
