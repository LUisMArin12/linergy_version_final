import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: { value: string | number; label: string }[];
  children?: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, children, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="mb-2 block text-sm font-semibold tracking-[-0.01em] text-[#0f172a]">{label}</label>}
        <div className="relative">
          <select
            ref={ref}
            className={clsx(
              'w-full min-h-[46px] appearance-none rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white/90 px-4 py-2.5 pr-11 text-[#0f172a]',
              'shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-all duration-200',
              'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[rgba(21,122,90,0.25)]',
              'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
              className
            )}
            {...props}
          >
            {options
              ? options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b]" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
