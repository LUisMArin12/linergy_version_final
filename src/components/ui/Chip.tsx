import { ReactNode, memo } from 'react';
import clsx from 'clsx';

interface ChipProps {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  className?: string;
}

const Chip = memo(function Chip({ children, selected = false, onClick, icon, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[rgba(21,122,90,0.25)] focus:ring-offset-1',
        {
          'border-[rgba(21,122,90,0.16)] bg-[rgba(21,122,90,0.1)] text-[#0b3d2e] shadow-[0_8px_20px_rgba(21,122,90,0.12)]': selected,
          'border-[rgba(15,23,42,0.08)] bg-white/90 text-[#475569] hover:border-[rgba(21,122,90,0.16)] hover:bg-white': !selected,
        },
        className
      )}
    >
      {icon && <span className="text-current">{icon}</span>}
      {children}
    </button>
  );
});

export default Chip;
