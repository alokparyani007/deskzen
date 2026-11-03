import { Link } from 'react-router-dom';
import { DeviceLock } from '../../components/DeviceLock';
import { glowUpStats, setupScore } from '../../lib/posture/glowUp';
import { formatGlowDate } from '../../lib/posture/glowStore';
import type { Baseline } from '../../lib/posture/types';
import { GlowOutline } from './GlowOutline';
import { shareGlowCard } from './shareGlowCard';

export function GlowUpReveal({
  before,
  glow,
  lightOk,
  next,
  history,
  onRestore,
}: {
  before: Baseline | null;
  glow: Baseline;
  lightOk: boolean;
  next: 'sit' | 'stand' | null;
  history: Baseline[];
  onRestore: (createdAt: string) => void;
}) {
  const stats = glowUpStats(before ?? glow, glow).map((item) => item.text);
  const eyeY = (glow.leftEye.y + glow.rightEye.y) / 2;
  const framed = Math.abs(glow.nose.x - 0.5) <= 0.08;
  const setup = setupScore({
    eyeY,
    distanceIn: glow.screenDistanceIn > 0 ? glow.screenDistanceIn : null,
    lightOk,
    framed,
  });
  const to = next ? `/calibrate?pose=${next}` : '/app';

  return (
    <div className="absolute inset-0 z-10 overflow-y-auto bg-white/90 p-3" role="status">
      <div className="mx-auto w-full max-w-lg rounded-3xl bg-white px-4 py-5 text-center shadow-lg sm:px-6">
        <p className="text-sm font-semibold text-brand">Your Glow</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Your Zen is set</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <figure>
            <GlowOutline baseline={before ?? glow} />
            <figcaption className="text-xs font-semibold text-ink-muted">Before</figcaption>
          </figure>
          <figure>
            <GlowOutline baseline={glow} />
            <figcaption className="text-xs font-semibold text-brand">Your Glow</figcaption>
          </figure>
        </div>
        {stats.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm font-semibold text-ink">
            {stats.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <ul className="mt-4 space-y-2 text-left text-sm">
          {setup.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface px-3 py-2">
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                <span className={`size-2 rounded-full ${item.ok ? 'bg-brand' : 'bg-glow'}`} aria-hidden="true" />
                {item.ok ? 'Looking good' : item.fix}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink"
            onClick={() => shareGlowCard(before, glow, stats)}
          >
            Share my Glow-up
          </button>
          <Link to={to} className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white">
            {next ? 'Continue' : 'Start DeskZen'}
          </Link>
        </div>
        {history.length > 0 ? (
          <div className="mt-4 text-left">
            <p className="text-xs font-semibold text-ink-muted">Restore previous</p>
            <ul className="mt-1 space-y-1">
              {history.map((item) => (
                <li key={item.createdAt}>
                  <button type="button" className="text-sm font-semibold text-brand" onClick={() => onRestore(item.createdAt)}>
                    {formatGlowDate(item.createdAt)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 flex justify-center">
          <DeviceLock />
        </div>
      </div>
    </div>
  );
}
