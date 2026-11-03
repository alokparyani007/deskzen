import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DeviceLock } from '../../components/DeviceLock';
import { glowCheckDue } from '../../lib/posture/glow';
import { formatGlowDate, loadGlowCheckDay, todayKey } from '../../lib/posture/glowStore';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';

export function GlowHomeCard() {
  const { baseline, standing, history, restore } = useBaseline();
  const { settings } = useSession();
  const pose = settings.workStyle === 'stand' ? 'stand' : 'sit';
  const saved = pose === 'stand' ? standing : baseline;
  const [today] = useState(() => todayKey());
  const [checkDay] = useState(() => loadGlowCheckDay());
  const due = Boolean(saved) && glowCheckDue(checkDay, today);

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      {saved ? (
        <>
          <h2 className="text-lg font-semibold text-ink">Your Glow baseline: set {formatGlowDate(saved.createdAt)}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/set-my-zen?pose=${pose}`} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
              Set my Zen
            </Link>
            {due ? (
              <Link to={`/calibrate?pose=${pose}&check=1`} className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-ink">
                Quick Glow check
              </Link>
            ) : null}
          </div>
          {history[pose].length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink-muted">Restore previous</p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {history[pose].map((item) => (
                  <li key={item.createdAt}>
                    <button type="button" className="text-sm font-semibold text-brand" onClick={() => void restore(pose, item.createdAt)}>
                      {formatGlowDate(item.createdAt)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-ink">Set my Zen to save your Posture Print</h2>
          <p className="mt-1 text-sm text-ink-muted">Set the posture DeskZen compares with, in about 20 seconds.</p>
          <Link to={`/set-my-zen?pose=${pose}`} className="mt-3 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
            Set my Zen
          </Link>
        </>
      )}
      <div className="mt-3">
        <DeviceLock />
      </div>
    </article>
  );
}
