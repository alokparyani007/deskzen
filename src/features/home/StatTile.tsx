import type { ReactNode } from 'react';

type StatTileProps = {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: 'brand' | 'glow' | 'sky';
};

const toneClass: Record<StatTileProps['tone'], string> = {
  brand: 'bg-brand-tint',
  glow: 'bg-glow-tint',
  sky: 'bg-sky-tint',
};

const iconClass: Record<StatTileProps['tone'], string> = {
  brand: 'text-brand',
  glow: 'text-glow',
  sky: 'text-sky-brand',
};

export function StatTile({ label, value, hint, icon, tone }: StatTileProps) {
  return (
    <article className={`rounded-2xl px-3 py-3 ${toneClass[tone]}`}>
      <div className={iconClass[tone]} aria-hidden="true">
        {icon}
      </div>
      <p className="mt-2 text-xs text-ink-muted">{label}</p>
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{hint}</p>
    </article>
  );
}
