import { featuresFor } from '../../lib/settings/visibility';
import { useSession } from '../session/session-context';
import { useWellness } from './wellness-context';

export function ModeBar() {
  const session = useSession();
  const wellness = useWellness();
  const features = featuresFor(session.settings.workStyle);
  if (!features.standingSection && !session.settings.intervalsOn) return null;
  const standing = session.posture === 'standing';
  const total = Math.max(wellness.interval.remainingMs, 1);
  const left = wellness.interval.due ? 0 : wellness.interval.remainingMs;
  const turn = Math.max(0, Math.min(1, 1 - left / Math.max(total, left)));
  const minutes = Math.ceil(left / 60_000);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-3 lg:px-8">
      {features.standingSection ? (
        <div className="inline-flex items-center gap-1 rounded-full bg-surface p-1 text-sm" role="group" aria-label="Posture mode">
          <ModeButton label="Sitting" on={session.posture === 'sitting'} onClick={() => session.choosePosture('sitting')} />
          <ModeButton label="Standing" on={standing} onClick={() => session.choosePosture('standing')} />
          {session.settings.workStyle === 'mixed' ? (
            <button type="button" className="rounded-full px-2 py-1 text-xs font-semibold text-ink-muted" onClick={session.followPosture}>
              {session.postureManual ? 'Manual' : 'Auto'}
            </button>
          ) : null}
        </div>
      ) : null}
      {session.settings.intervalsOn && features.intervalSection ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-ink shadow-sm">
          <Ring turn={turn} />
          <span>
            {standing ? 'Standing' : wellness.interval.phase === 'move' ? 'Move' : 'Sitting'}
            <span className="text-ink-muted"> · {wellness.interval.due ? 'time to switch' : `${minutes} min left`}</span>
          </span>
        </p>
      ) : null}
    </div>
  );
}

function ModeButton({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1 font-semibold ${on ? 'bg-brand text-white' : 'text-ink-muted'}`}
      aria-pressed={on}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Ring({ turn }: { turn: number }) {
  const radius = 8;
  const length = 2 * Math.PI * radius;
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r={radius} fill="none" stroke="var(--color-glow)" strokeOpacity="0.35" strokeWidth="3" />
      <circle
        cx="11"
        cy="11"
        r={radius}
        fill="none"
        stroke="var(--color-glow)"
        strokeWidth="3"
        strokeDasharray={`${length * turn} ${length}`}
        strokeLinecap="round"
        transform="rotate(-90 11 11)"
      />
    </svg>
  );
}
