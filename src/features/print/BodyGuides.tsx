import { useEffect, useRef, useState } from 'react';
import { calibrationConfig } from '../../calibration/config';
import type { Landmarks } from '../../lib/posture/types';
import { screenPath } from '../../lib/vision/toScreen';
import { bodyOutlineParts } from './bodyOutline';

export function BodyGuides({
  landmarks,
  hot,
  showArrow,
  breathElapsed,
  reduced,
  tone = 'print',
}: {
  landmarks: Landmarks | null;
  hot: boolean;
  showArrow: boolean;
  breathElapsed: number | null;
  reduced: boolean;
  tone?: 'print' | 'glow';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const apply = () => setBox({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = landmarks?.videoWidth ?? 0;
  const height = landmarks?.videoHeight ?? 0;
  const parts = bodyOutlineParts(landmarks);
  const shoulder = width > 0 ? screenPath(parts.shoulder, width, height, box.width, box.height, false) : '';
  const neck = width > 0 ? screenPath(parts.neck, width, height, box.width, box.height, false) : '';
  const breath = breathElapsed === null ? null : breathScale(breathElapsed);
  const color = tone === 'glow' ? 'text-glow' : hot && reduced ? 'text-brand-light' : 'text-print';
  const pulse = hot && !reduced ? 'shoulder-glow-hot' : '';

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      {shoulder || neck ? (
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
          {shoulder ? <path d={shoulder} className={`${color} ${pulse}`} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={hot ? 1 : 0.8} /> : null}
          {neck ? <path d={neck} className={`${color} ${pulse}`} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={hot ? 1 : 0.8} /> : null}
        </svg>
      ) : null}
      {showArrow && !reduced ? (
        <span className="reset-arrow pointer-events-none absolute left-1/2 top-1/3 text-glow" aria-hidden="true">
          <svg viewBox="0 0 16 16" className="size-6">
            <path d="M8 2v12M8 2l-3 3M8 2l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      ) : null}
      {breath ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div
            className="flex size-28 items-center justify-center rounded-full border-2 border-print/80 bg-print/15 text-center text-sm font-semibold text-white"
            style={{ transform: reduced ? undefined : `scale(${breath.scale})` }}
          >
            {breath.label}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function breathScale(elapsed: number): { scale: number; label: string } {
  const { breathInMs, breathOutMs } = calibrationConfig.bodyReset;
  if (elapsed < breathInMs) {
    return { scale: 0.72 + (elapsed / breathInMs) * 0.46, label: 'Breathe in' };
  }
  const out = Math.min(1, (elapsed - breathInMs) / breathOutMs);
  return { scale: 1.18 - out * 0.46, label: 'and slowly out' };
}
