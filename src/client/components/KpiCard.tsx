import type { LucideIcon } from 'lucide-react';
import { Card } from './Card';

type Props = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  loading?: boolean;
};

export function KpiCard({ label, value, hint, icon: Icon, loading }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-8 w-24 rounded bg-slate-100 animate-pulse" />
          ) : (
            <p className="mt-1 text-2xl font-semibold text-slate-900 truncate">
              {value}
            </p>
          )}
          {hint ? (
            <p className="mt-1 text-xs text-slate-500 truncate">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="shrink-0 rounded-lg bg-rose-50 text-rose-600 p-2">
            <Icon className="w-5 h-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
