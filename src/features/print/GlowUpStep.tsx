import { useEffect, useState } from 'react';
import { slouchChecklist } from '../../calibration/catchMeter';
import type { Silhouette } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { CheckIcon } from './CheckIcon';
import { mirroredFit, posturePrintPoints, shoulderCenteredFit } from './outlineFit';
import { shownOutlineAccuracy } from './zenSet';
import { useZenChrome } from './zenChrome';

export function GlowUpStep({
  zen,
  confidence,
  gaveUp,
  outlineFallback = false,
  silhouette = null,
  mode = 'sit',
  onStart,
  onRetry,
}: {
  zen: Landmarks[];
  confidence: number;
  gaveUp: boolean;
  outlineFallback?: boolean;
  silhouette?: Silhouette | null;
  mode?: 'sit' | 'stand';
  onStart: () => void;
  onRetry: () => void;
}) {
  const [reduced, setReduced] = useState(false);
  const points = posturePrintPoints(silhouette, zen);
  const focus = shoulderFocus(silhouette, zen);
  const fit = points && focus ? shoulderCenteredFit(points, focus) : points ? mirroredFit(points) : null;
  const accuracy = shownOutlineAccuracy(confidence, outlineFallback);
  const standing = mode === 'stand';
  useZenChrome({
    title: 'Your Zen is set',
    helper: "Your posture baseline is ready. We'll help you stay balanced.",
    countdown: null,
    holdFraction: 0,
    nextLabel: 'Start Live view',
    backLabel: 'Redo',
    showCard: false,
    showNav: true,
    locking: false,
    onBack: onRetry,
    onNext: onStart,
  });

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  return (
    <section className="mx-auto flex h-full max-w-5xl flex-col justify-center overflow-hidden px-6 py-4 text-white">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-sm font-medium backdrop-blur-md">
          <span className={reduced ? 'text-glow' : 'spark-once text-glow'} aria-hidden="true">✦</span>
          Nice work!
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-outline">Your Zen is set</h1>
        <p className="mt-2 text-base text-white/80">Your posture baseline is ready. We&apos;ll help you stay balanced.</p>
      </div>
      <div className="mt-6 grid items-stretch gap-4 md:grid-cols-2">
        <div className="relative rounded-[20px] border border-white/12 bg-white/8 p-4 backdrop-blur-md">
          <p className="text-sm text-white/80">Your Posture Print</p>
          {fit ? (
            <svg viewBox={fit.viewBox} className="mx-auto mt-1 h-[min(36vh,280px)] w-full" role="img" aria-label="Your traced posture outline">
              <defs>
                <linearGradient id="zen-print-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-outline)" />
                  <stop offset="100%" stopColor="var(--color-print)" />
                </linearGradient>
              </defs>
              <path d={fit.d} fill="url(#zen-print-fill)" stroke="var(--color-outline)" strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
          ) : (
            <p className="px-4 py-12 text-center text-sm font-semibold">
              We couldn&apos;t trace your outline.{' '}
              <button type="button" className="font-semibold text-outline underline" onClick={onRetry}>Redo</button>
            </p>
          )}
          {fit ? (
            <span className="absolute bottom-4 left-1/2 flex size-9 -translate-x-1/2 items-center justify-center rounded-full bg-print text-white shadow">
              <CheckIcon className="size-4" />
            </span>
          ) : null}
        </div>
        <div className="rounded-[20px] border border-white/12 bg-slate-900/70 p-5 backdrop-blur-md">
          <ul className="space-y-4">
            <CheckRow label="Best posture saved" marked />
            <CheckRow label={slouchChecklist(gaveUp)} marked={!gaveUp} />
            <li className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-white/10 text-outline">
                {standing ? <StandIcon /> : <ChairIcon />}
              </span>
              <span className="font-semibold">Mode: {standing ? 'Standing' : 'Sitting'}</span>
            </li>
          </ul>
          <p className="mt-4 flex items-center gap-2 border-t border-white/15 pt-4 text-sm text-white/80">
            <span className="text-glow" aria-hidden="true">✦</span>
            Outline accuracy: {accuracy}
          </p>
          <button type="button" className="mt-5 min-h-12 w-full rounded-full bg-print text-lg font-semibold text-white" onClick={onStart}>
            Start Live view
          </button>
          <button type="button" className="mt-2 min-h-11 w-full text-sm font-semibold text-outline" onClick={onRetry}>
            Redo
          </button>
        </div>
      </div>
      <p className="mt-5 text-center text-sm text-white/80">Moved your desk or chair? Set your Zen again anytime.</p>
      <p className="mt-1 text-center text-xs text-white/70">DeskZen is a wellness tool, not a medical device.</p>
    </section>
  );
}

function CheckRow({ label, marked }: { label: string; marked: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${marked ? 'bg-brand-tint text-print' : 'bg-white/10 text-white/50'}`}>
        {marked ? <CheckIcon className="size-5" /> : null}
      </span>
      <span className="font-semibold">{label}</span>
    </li>
  );
}

function shoulderFocus(silhouette: Silhouette | null, frames: readonly Landmarks[]): { x: number; y: number; width: number } | null {
  if (silhouette && silhouette.anchors.shoulderWidth > 0) {
    return { x: silhouette.anchors.shoulderX, y: silhouette.anchors.shoulderY, width: silhouette.anchors.shoulderWidth };
  }
  const frame = frames.find((item) => item.leftShoulder && item.rightShoulder);
  if (!frame?.leftShoulder || !frame.rightShoulder) return null;
  const width = Math.hypot(frame.rightShoulder.x - frame.leftShoulder.x, frame.rightShoulder.y - frame.leftShoulder.y);
  if (width < 8) return null;
  return {
    x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2,
    y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2,
    width,
  };
}

function ChairIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path d="M7 10V5h10v5M7 10h10M9 10v7M15 10v7M8 17h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <circle cx="12" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v7M12 11 8 14M12 11l4 3M12 14l-3 6M12 14l3 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
