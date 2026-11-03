import type { NormPoint } from '../../lib/posture/types';
import { zenConfig } from './zenConfig';
import { place } from './OutlineSvg';

export function SnapOverlay({
  countdown,
  videoWidth,
  videoHeight,
  viewWidth,
  viewHeight,
  dots,
}: {
  countdown: number | null;
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
  dots: readonly NormPoint[];
}) {
  const box = guideBox(videoWidth, videoHeight, viewWidth, viewHeight);
  const eye = place({ x: 0.2, y: zenConfig.eyeGuideY }, videoWidth, videoHeight, viewWidth, viewHeight);
  const eyeEnd = place({ x: 0.8, y: zenConfig.eyeGuideY }, videoWidth, videoHeight, viewWidth, viewHeight);
  return (
    <>
      <div className="pointer-events-none absolute border-white/80" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
        <Corner className="left-0 top-0 border-l-2 border-t-2" />
        <Corner className="right-0 top-0 border-r-2 border-t-2" />
        <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
        <Corner className="bottom-0 right-0 border-b-2 border-r-2" />
      </div>
      <div className="pointer-events-none absolute border-t border-dashed border-white/70" style={{ left: Math.min(eye.x, eyeEnd.x), top: eye.y, width: Math.abs(eyeEnd.x - eye.x) }}>
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs tracking-wide text-white/80">eyes here</span>
      </div>
      {dots.map((dot, index) => {
        const at = place(dot, videoWidth, videoHeight, viewWidth, viewHeight);
        return <span key={index} className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow" style={{ left: at.x, top: at.y }} />;
      })}
      {countdown !== null && countdown > 0 ? (
        <p className="pointer-events-none absolute left-1/2 top-[64%] -translate-x-1/2 -translate-y-1/2 text-8xl font-semibold text-white/85">{countdown}</p>
      ) : null}
    </>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute size-8 ${className}`} />;
}

function guideBox(videoWidth: number, videoHeight: number, viewWidth: number, viewHeight: number): { x: number; y: number; w: number; h: number } {
  const a = place({ x: 0.38, y: 0.16 }, videoWidth, videoHeight, viewWidth, viewHeight);
  const b = place({ x: 0.62, y: 0.5 }, videoWidth, videoHeight, viewWidth, viewHeight);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}
