import { sitStandLine } from '../../lib/wellness/format';
import { useWellness } from '../wellness/wellness-context';

export function SitStandBar() {
  const { interval } = useWellness();
  const total = Math.max(interval.sitMs + interval.standMs, 1);
  const sitShare = (interval.sitMs / total) * 100;
  const standShare = (interval.standMs / total) * 100;

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">{sitStandLine(interval.sitMs, interval.standMs)}</h2>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <span className="h-full bg-brand" style={{ width: `${sitShare}%` }} />
        <span className="h-full bg-sky-brand" style={{ width: `${standShare}%` }} />
      </div>
      <p className="mt-2 flex gap-4 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
          Sitting
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-sky-brand" aria-hidden="true" />
          Standing
        </span>
      </p>
    </article>
  );
}
