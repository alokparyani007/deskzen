import { useEffect, useRef, useState } from 'react';
import { denormalizeContour, silhouetteIsUsable, type Point, type Silhouette } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { screenPath } from '../../lib/vision/toScreen';
import { landmarkBodyPoints } from './landmarkBody';

export function SlouchOutlines({
  best,
  bestFrame,
  liveContour,
  liveFrame,
}: {
  best: Silhouette | null;
  bestFrame: Landmarks | null;
  liveContour: Point[] | null;
  liveFrame: Landmarks | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 16, height: 9 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const apply = () => setBox({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const video = liveFrame ?? bestFrame;
  const videoWidth = video?.videoWidth ?? bestFrame?.videoWidth ?? 0;
  const videoHeight = video?.videoHeight ?? bestFrame?.videoHeight ?? 0;
  const bestPoints = bestOutline(best, bestFrame);
  const livePoints = liveOutline(liveContour, liveFrame);
  const bestPath = videoWidth > 0 ? screenPath(bestPoints, videoWidth, videoHeight, box.width, box.height) : '';
  const livePath = videoWidth > 0 ? screenPath(livePoints, videoWidth, videoHeight, box.width, box.height) : '';

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        {bestPath ? <path d={bestPath} fill="none" stroke="var(--color-outline)" strokeWidth="3" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.55" /> : null}
        {livePath ? (
          <path d={livePath} fill="none" stroke="var(--color-glow)" strokeWidth="2.5" strokeDasharray="8 6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ) : null}
      </svg>
    </div>
  );
}

function bestOutline(best: Silhouette | null, frame: Landmarks | null): Point[] {
  if (best && silhouetteIsUsable(best)) return denormalizeContour(best.points, best.anchors);
  if (!frame) return [];
  return landmarkBodyPoints(frame) ?? [];
}

function liveOutline(contour: Point[] | null, frame: Landmarks | null): Point[] {
  if (contour && contour.length >= 8) return contour;
  if (!frame) return [];
  return landmarkBodyPoints(frame) ?? [];
}
