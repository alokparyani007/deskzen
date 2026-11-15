import { SETUP_TIME_LEAD } from '../../lib/copy/setupTime';

const RAIL = [
  { id: 'setup', label: 'Frame check' },
  { id: 'reset', label: 'Loosen up' },
  { id: 'lock', label: 'Find your best' },
  { id: 'catch', label: 'Learn your slouch' },
] as const;

const COACH: Record<(typeof RAIL)[number]['id'], string> = {
  setup: 'Let me see your whole upper body. Sit back a little if the chips are not green.',
  reset: 'Roll, stretch, glide, then one easy breath. Move only as far as feels good.',
  lock: 'Sit tall and hold still. I will trace your outline while you hold.',
  catch: 'Show me the slouch you usually fall into. Then sit back up tall.',
};

export function PrintRail({ step }: { step: (typeof RAIL)[number]['id'] }) {
  const index = RAIL.findIndex((item) => item.id === step);
  return (
    <aside className="px-4">
      <p className="text-sm font-semibold text-ink">{SETUP_TIME_LEAD} total</p>
      <ol className="mt-3 hidden gap-2 lg:grid">
        {RAIL.map((item, itemIndex) => (
          <li key={item.id} className={`rounded-xl px-3 py-2 text-sm font-semibold ${itemIndex === index ? 'bg-brand-tint text-brand' : itemIndex < index ? 'text-print' : 'text-ink-muted'}`}>
            {itemIndex + 1} {item.label}
            <span className="mt-0.5 block text-xs font-medium">{itemIndex < index ? 'Done' : itemIndex === index ? 'Active' : 'Upcoming'}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm font-semibold text-ink lg:hidden">
        {index + 1} of {RAIL.length} · {RAIL[index]?.label}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface lg:hidden">
        <div className="h-full bg-print" style={{ width: `${((index + 1) / RAIL.length) * 100}%` }} />
      </div>
    </aside>
  );
}

export function CoachCard({ step }: { step: (typeof RAIL)[number]['id'] }) {
  return (
    <aside className="mx-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Coach</p>
      <p className="mt-2 text-sm font-semibold text-ink" aria-live="polite">{COACH[step]}</p>
    </aside>
  );
}

export function isRailStep(step: string): step is (typeof RAIL)[number]['id'] {
  return RAIL.some((item) => item.id === step);
}
