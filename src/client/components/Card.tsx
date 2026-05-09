import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
