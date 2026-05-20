import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-semibold tracking-[-0.01em] text-[#0f172a]">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={clsx(
              'w-full min-h-[46px] rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/90 px-4 py-2.5 text-[#0f172a]',
              'shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-all duration-200',
              'placeholder:text-[#94a3b8] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgba(21,122,90,0.25)]',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              {
                'pl-11': icon,
                'border-red-300 focus:ring-[rgba(239,68,68,0.2)]': error,
              },
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
