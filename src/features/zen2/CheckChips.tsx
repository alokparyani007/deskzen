import { Check } from 'lucide-react';
import { chipLabel } from './poseRules';
import type { ChipRuntime } from './chipSequence';
import type { PoseMode } from './zenConfig';

export function CheckChips({ chips, mode }: { chips: readonly ChipRuntime[]; mode: PoseMode }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2" role="list" aria-label="Posture checks">
      {chips.map((chip) => {
        const done = chip.status === 'done';
        const active = chip.status === 'active';
        const label = chipLabel(chip.id, mode);
        return (
          <span
            key={chip.id}
            role="listitem"
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
              done ? 'border-print bg-print text-white' : active ? 'border-glow bg-stage/80 text-glow' : 'border-white/25 bg-stage/50 text-white/55'
            }`}
          >
            {done ? <Check className="size-3.5" aria-hidden="true" /> : null}
            {label}
            <span className="sr-only">{done ? 'done' : active ? 'in progress' : 'not yet'}</span>
          </span>
        );
      })}
    </div>
  );
}
