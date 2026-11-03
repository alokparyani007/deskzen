import { useState } from 'react';
import type { CalloutId } from './poseRules';
import { zenConfig, type PoseMode } from './zenConfig';

const CALLOUTS: Record<PoseMode, { id: CalloutId; text: string; dot: { x: number; y: number }; label: { x: number; y: number } }[]> = {
  sit: [
    { id: 'eyes', text: 'Eyes level with top of screen', dot: { x: 46, y: 17 }, label: { x: 58, y: 12 } },
    { id: 'ears', text: 'Ears over shoulders', dot: { x: 40, y: 26 }, label: { x: 58, y: 28 } },
    { id: 'shoulders', text: 'Shoulders relaxed and level', dot: { x: 36, y: 36 }, label: { x: 58, y: 42 } },
    { id: 'screen', text: "Screen about an arm's length away", dot: { x: 70, y: 24 }, label: { x: 58, y: 2 } },
  ],
  stand: [
    { id: 'eyes', text: 'Eyes level with top of screen', dot: { x: 34, y: 14 }, label: { x: 52, y: 8 } },
    { id: 'ears', text: 'Ears over shoulders', dot: { x: 30, y: 22 }, label: { x: 52, y: 22 } },
    { id: 'shoulders', text: 'Shoulders relaxed and level', dot: { x: 28, y: 32 }, label: { x: 52, y: 36 } },
    { id: 'screen', text: "Screen about an arm's length away", dot: { x: 58, y: 28 }, label: { x: 52, y: 48 } },
  ],
};

/** Mint patches over printed words the crop still includes. Percents of the crop box. */
const COVERS: Record<PoseMode, { x: number; y: number; w: number; h: number }[]> = {
  sit: [
    { x: 0, y: 34, w: 11, h: 18 },
    { x: 54, y: 0, w: 46, h: 16 },
    { x: 60, y: 14, w: 40, h: 30 },
    { x: 54, y: 42, w: 46, h: 14 },
    { x: 58, y: 54, w: 42, h: 12 },
    { x: 62, y: 70, w: 38, h: 30 },
  ],
  stand: [
    { x: 0, y: 0, w: 70, h: 9 },
    { x: 64, y: 6, w: 36, h: 94 },
  ],
};

export function PostureSidePanel({
  mode,
  active,
  reduced,
  onMode,
}: {
  mode: PoseMode;
  active: CalloutId | null;
  reduced: boolean;
  onMode: (mode: PoseMode) => void;
}) {
  const [src, setSrc] = useState('/media/guides/good-desk-posture-clean.jpg');
  const crop = mode === 'stand' ? zenConfig.crop.stand : zenConfig.crop.sit;
  const standing = mode === 'stand';
  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-print/20 bg-stage p-3" aria-label="Correct posture">
      <h2 className="px-1 text-xl font-semibold text-white">Correct posture</h2>
      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-xl bg-mint-panel">
        <div className="relative h-full w-full" style={{ aspectRatio: `${crop.w} / ${crop.h}` }}>
          <img
            src={src}
            alt={standing ? 'Illustration of good desk posture while standing' : 'Illustration of good desk posture while sitting'}
            className="absolute max-w-none"
            style={{
              width: `${(zenConfig.crop.sourceW / crop.w) * 100}%`,
              height: `${(zenConfig.crop.sourceH / crop.h) * 100}%`,
              left: `${(-crop.x / crop.w) * 100}%`,
              top: `${(-crop.y / crop.h) * 100}%`,
            }}
            onError={() => {
              if (src.includes('clean')) setSrc('/media/guides/good-desk-posture.jpg');
            }}
          />
          {COVERS[mode].map((cover) => (
            <span key={`${cover.x}-${cover.y}`} className="absolute bg-mint-panel" style={{ left: `${cover.x}%`, top: `${cover.y}%`, width: `${cover.w}%`, height: `${cover.h}%` }} aria-hidden="true" />
          ))}
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {CALLOUTS[mode].map((item) => {
              const on = item.id === active;
              return (
                <line
                  key={item.id}
                  x1={item.dot.x}
                  y1={item.dot.y}
                  x2={item.label.x}
                  y2={item.label.y + 2}
                  stroke={on ? 'var(--color-glow)' : 'var(--color-callout)'}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          {CALLOUTS[mode].map((item) => {
            const on = item.id === active;
            return (
              <span key={item.id}>
                <span
                  className={`absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${on ? 'bg-glow' : 'bg-callout'} ${on && !reduced ? 'motion-safe:animate-pulse' : ''}`}
                  style={{ left: `${item.dot.x}%`, top: `${item.dot.y}%` }}
                  aria-hidden="true"
                />
                <p
                  className={`absolute w-[40%] text-[13px] font-semibold leading-tight ${on ? 'text-glow' : 'text-callout'} ${on && !reduced ? 'motion-safe:animate-pulse' : ''}`}
                  style={{ left: `${item.label.x}%`, top: `${item.label.y}%` }}
                >
                  {item.text}
                </p>
              </span>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-sm font-semibold">
        <span className={standing ? 'text-white/60' : 'text-white'}>Sitting</span>
        <button
          type="button"
          role="switch"
          aria-checked={standing}
          aria-label={standing ? 'Standing posture' : 'Sitting posture'}
          className="relative h-7 w-12 rounded-full bg-white/15"
          onClick={() => onMode(standing ? 'sit' : 'stand')}
        >
          <span className={`absolute top-0.5 size-6 rounded-full bg-white transition-transform ${standing ? 'left-5' : 'left-0.5'}`} />
        </button>
        <span className={standing ? 'text-white' : 'text-white/60'}>Standing</span>
      </div>
    </aside>
  );
}
