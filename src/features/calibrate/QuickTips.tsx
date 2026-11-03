import type { CalibrationChips } from '../../lib/posture/calibrationCue';

const TIPS = ['Feet flat', 'Back against the chair', 'Screen at eye level', "About an arm's length away"];

export function QuickTips({ chips }: { chips: CalibrationChips }) {
  return (
    <aside className="space-y-3">
      <ul className="flex flex-wrap gap-2" aria-label="Setup status">
        <Chip label="Position" on={chips.position} />
        <Chip label="Level" on={chips.level} />
        <Chip label="Distance" on={chips.distance} />
      </ul>
      <details className="rounded-2xl border border-ink/10 bg-white p-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Quick tips</summary>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </details>
    </aside>
  );
}

function Chip({ label, on }: { label: string; on: boolean }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-ink shadow-sm">
      <span className={`size-2.5 rounded-full ${on ? 'bg-brand-light' : 'bg-glow'}`} aria-hidden="true" />
      <span>
        {label}
        <span className="sr-only">{on ? ', ready' : ', not yet'}</span>
      </span>
    </li>
  );
}
