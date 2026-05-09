import type { HTMLAttributes, ReactNode } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
};

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
