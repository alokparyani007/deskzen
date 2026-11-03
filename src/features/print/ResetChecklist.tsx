import { CheckIcon } from './CheckIcon';
import { MoveIcon } from './moveIcons';
import { RESET_MOVES } from './resetFlow';
import type { MoveMark } from './resetLog';

export function MoveProgress({ index, marks }: { index: number; marks: readonly MoveMark[] }) {
  return (
    <ol className="mx-auto flex max-w-3xl items-start gap-2 px-2" aria-label={`Move ${index + 1} of 4`}>
      {RESET_MOVES.map((move, itemIndex) => {
        const done = marks[itemIndex] === 'seen' || itemIndex < index;
        const current = itemIndex === index;
        return (
          <li key={move.kind} className="flex flex-1 flex-col items-center gap-1">
            <span className="flex w-full items-center">
              {itemIndex > 0 ? <span className={`h-0.5 flex-1 ${done || current ? 'bg-print/40' : 'bg-surface'}`} /> : <span className="flex-1" />}
              <span className={`size-3.5 rounded-full ${current ? 'bg-glow' : done ? 'bg-print' : 'bg-surface'}`} />
              {itemIndex < RESET_MOVES.length - 1 ? <span className={`h-0.5 flex-1 ${done ? 'bg-print/40' : 'bg-surface'}`} /> : <span className="flex-1" />}
            </span>
            <span className={`text-center text-xs font-semibold ${current ? 'text-glow' : 'text-ink-muted'}`}>
              {current ? `Move ${index + 1} of 4` : `Move ${itemIndex + 1}`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function MoveCard({
  index,
  nice,
  patient,
  sides,
  reduced,
}: {
  index: number;
  nice: boolean;
  patient: boolean;
  sides: { left: boolean; right: boolean };
  reduced: boolean;
}) {
  const move = RESET_MOVES[index]!;
  return (
    <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-6 text-center shadow-sm ring-1 ring-surface">
      <MoveIcon kind={move.kind} active={!nice} reduced={reduced} large />
      <h2 className="mt-3 text-2xl font-semibold text-ink">{move.title}</h2>
      <p className="mt-2 max-w-xs text-base text-ink-muted" aria-live="polite">
        {patient ? "No worries, that's fine. Tap Next." : move.caption}
      </p>
      {nice ? (
        <p className={`mt-4 inline-flex items-center gap-1 rounded-full bg-print px-3 py-1 text-sm font-semibold text-white ${reduced ? '' : 'nice-pop'}`}>
          Nice! <CheckIcon className="size-4" />
        </p>
      ) : null}
      {move.kind === 'neck' ? (
        <div className="mt-4 flex gap-2">
          <SidePill label="Left" done={sides.left} />
          <SidePill label="Right" done={sides.right} />
        </div>
      ) : null}
    </div>
  );
}

function SidePill({ label, done }: { label: string; done: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold ${done ? 'bg-print text-white' : 'bg-white text-ink ring-1 ring-ink/15'}`}>
      {label}
      {done ? <CheckIcon className="size-4" /> : null}
    </span>
  );
}
