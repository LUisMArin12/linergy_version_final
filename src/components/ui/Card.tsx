import { ReactNode, HTMLAttributes, memo } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  clickable?: boolean;
}

const Card = memo(function Card({ children, hover = false, clickable = false, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-white/90 backdrop-blur-xl transition-all duration-200',
        'shadow-[0_10px_28px_rgba(15,23,42,0.06)]',
        {
          'hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)] hover:border-[rgba(21,122,90,0.14)]': hover,
          'cursor-pointer': clickable,
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export default Card;
