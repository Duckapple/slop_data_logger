import type { ReactNode } from 'react';
import { Gavel } from 'lucide-react';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 via-white to-rose-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="rounded-lg bg-rose-600 text-white p-1.5 shadow-sm">
            <Gavel className="w-4 h-4" aria-hidden />
          </span>
          <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Name Crimes
          </span>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 dark:bg-slate-900 dark:border-slate-800">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-5">{children}</div>
        </div>
        {footer ? (
          <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
