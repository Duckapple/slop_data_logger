import { Feather, Flame, AlertTriangle } from 'lucide-react';

type Tier = 'minor' | 'moderate' | 'severe';

function tier(distance: number): Tier {
  if (distance <= 1) return 'minor';
  if (distance <= 3) return 'moderate';
  return 'severe';
}

const styles: Record<Tier, { wrap: string; icon: typeof Feather }> = {
  minor: {
    wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: Feather,
  },
  moderate: {
    wrap: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: AlertTriangle,
  },
  severe: {
    wrap: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: Flame,
  },
};

export function EditDistanceBadge({
  distance,
  size = 'sm',
}: {
  distance: number;
  size?: 'sm' | 'md';
}) {
  const t = tier(distance);
  const Icon = styles[t].icon;
  const sizeCls =
    size === 'md'
      ? 'text-sm px-3 py-1 gap-1.5'
      : 'text-xs px-2 py-0.5 gap-1';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${styles[t].wrap} ${sizeCls}`}
      aria-label={`Edit distance ${distance}`}
      title={`Edit distance ${distance}`}
    >
      <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3 h-3'} aria-hidden />
      <span>{distance}</span>
    </span>
  );
}
