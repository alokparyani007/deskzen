import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import type { NormPoint } from '../../lib/posture/types';
import type { CapturedFrame } from './captureFrame';
import { OutlineSvg, useStageBox, type OutlineMarks } from './OutlineSvg';

export function OutlineStep({
  capture,
  outline,
  marks,
  badges = [],
}: {
  capture: CapturedFrame;
  outline: readonly NormPoint[] | null;
  marks?: OutlineMarks | null;
  /** Step 2 check chips, stacked at the lower right of the picture (mockup 03b), clear of the shoulders. */
  badges?: { label: string; pass: boolean }[];
}) {
  const viewRef = useRef<HTMLCanvasElement>(null);
  const stage = useStageBox();
  useEffect(() => {
    const view = viewRef.current;
    if (!view || capture.canvas.width === 0) return;
    view.width = capture.width;
    view.height = capture.height;
    view.getContext('2d')?.drawImage(capture.canvas as CanvasImageSource, 0, 0);
    return () => {
      view.width = 0;
      view.height = 0;
    };
  }, [capture]);
  return (
    <div ref={stage.ref} className="absolute inset-0 overflow-hidden rounded-2xl bg-black">
      <canvas ref={viewRef} className="h-full w-full -scale-x-100 object-cover" aria-label="Picture" />
      <span className="absolute left-3 top-3 rounded-lg bg-slate-900/70 px-2 py-1 text-xs text-white">Picture</span>
      <OutlineSvg saved={outline} dim fill marks={outline ? marks : null} videoWidth={capture.width} videoHeight={capture.height} viewWidth={stage.width} viewHeight={stage.height} />
      {badges.length > 0 ? (
        <ul className="absolute bottom-3 right-3 flex flex-col gap-2 max-[599px]:max-w-[70%] max-[599px]:items-end">
          {badges.map((badge) => (
            <li key={badge.label} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-slate-900/75 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
              <span className={`flex size-5 items-center justify-center rounded-full ${badge.pass ? 'bg-print text-white' : 'bg-glow text-ink'}`}>
                {badge.pass ? <Check className="size-3.5" aria-hidden="true" /> : <span aria-hidden="true" className="text-xs font-bold">!</span>}
              </span>
              {badge.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
