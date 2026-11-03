import { featuresFor } from '../../lib/settings/visibility';
import { stoodSummary } from '../../lib/wellness/format';
import { useSession } from '../session/session-context';
import { useWellness } from './wellness-context';

export function WellnessPanel() {
  const session = useSession();
  const wellness = useWellness();
  const features = featuresFor(session.settings.workStyle);
  if (!features.intervalSection && !features.standBreaks) return null;
  const { sitMs, standMs, moveMs, switches } = wellness.interval;
  const total = Math.max(1, sitMs + standMs + moveMs);
  const goal = Math.max(1, session.settings.dailySwitchGoal);

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Today&apos;s movement</h2>
      <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <span className="bg-brand" style={{ width: `${(sitMs / total) * 100}%` }} />
        <span className="bg-glow" style={{ width: `${(standMs / total) * 100}%` }} />
        <span className="bg-sky-brand" style={{ width: `${(moveMs / total) * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-ink-muted">Green is sitting, amber is standing, blue is moving.</p>
      {features.intervalSection ? (
        <p className="mt-3 text-sm text-ink">
          <span className="font-semibold">{Math.min(switches, goal)}</span> of {goal} switches today
        </p>
      ) : null}
      <p className="mt-1 text-sm text-ink">{stoodSummary(wellness.weekStandMs)}</p>
    </section>
  );
}
