import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DeviceLock } from '../../components/DeviceLock';
import { glowStats } from '../../lib/posture/glow';
import { readSignals } from '../../lib/posture/readSignals';
import { scoreFrame } from '../../lib/posture/score';
import type { Baseline, Landmarks } from '../../lib/posture/types';
import { formatGlowDate } from '../../lib/posture/glowStore';
import { GlowOutline } from './GlowOutline';

const CONFETTI = [12, 28, 44, 58, 72, 86];

export function GlowResult({
  baseline,
  landmarks,
  next,
  history,
  onRestore,
}: {
  baseline: Baseline;
  landmarks: Landmarks | null;
  next: 'sit' | 'stand' | null;
  history: Baseline[];
  onRestore: (createdAt: string) => void;
}) {
  const [picked, setPicked] = useState<Baseline | null>(null);
  const shown = picked ?? baseline;
  const stats = glowStats(shown);
  const [showLean, setShowLean] = useState(true);
  const score = useMemo(() => {
    if (!landmarks) return 100;
    const sensed = readSignals(landmarks, shown, { movingUntilMs: 0 });
    if (sensed.readings.quality !== 'good') return 100;
    return Math.round(scoreFrame(sensed.readings, undefined, 0, 1).smoothed);
  }, [landmarks, shown]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowLean(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const to = next ? `/calibrate?pose=${next}` : '/app';

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-white/80 p-3" role="status">
      <div className="glow-pulse relative w-full max-w-md rounded-3xl bg-white px-5 py-6 text-center shadow-lg">
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-6" aria-hidden="true">
          {CONFETTI.map((left) => (
            <span key={left} className="confetti-bit mt-2 size-2 rounded-full bg-brand-light" style={{ marginLeft: left / 10 }} />
          ))}
        </div>
        <p className="text-sm font-semibold text-brand">Your Glow</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Your posture, your baseline</h2>
        <GlowOutline baseline={shown} />
        <dl className="mt-2 space-y-2 text-left text-sm">
          <Stat label="Screen distance" value={stats.distance} />
          <Stat label="Head position" value={stats.head} />
          <Stat label="Shoulder line" value={stats.shoulders} />
        </dl>
        <p className="mt-4 text-sm text-ink-muted">{showLean ? 'Try leaning in' : 'Glow Score preview'}</p>
        <p className="text-4xl font-semibold text-brand" aria-live="polite">
          {score}
        </p>
        <div className="mt-3 flex justify-center">
          <DeviceLock />
        </div>
        {history.length > 0 ? (
          <div className="mt-4 text-left">
            <p className="text-xs font-semibold text-ink-muted">Restore previous</p>
            <ul className="mt-1 space-y-1">
              {history.map((item) => (
                <li key={item.createdAt}>
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand"
                    onClick={() => {
                      setPicked(item);
                      onRestore(item.createdAt);
                    }}
                  >
                    {formatGlowDate(item.createdAt)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link to={to} className="mt-5 inline-flex rounded-2xl bg-brand px-6 py-3 text-base font-semibold text-white">
          {next ? 'Continue' : 'Start DeskZen'}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl bg-surface px-3 py-2">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
