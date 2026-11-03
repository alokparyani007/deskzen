import { useEffect, useRef, useState } from 'react';
import type { Landmarks, NormPoint } from '../../lib/posture/types';
import { readPersonMask } from '../../lib/vision/segment';
import { outlineFromMask } from './snapshotOutline';
import type { PoseMode } from './zenConfig';

export function usePersonOutline(video: HTMLVideoElement | null, frame: Landmarks | null, active: boolean, hz: number, mode: PoseMode): { points: NormPoint[] | null; hz: number } {
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const [points, setPoints] = useState<NormPoint[] | null>(null);
  const [seen, setSeen] = useState(0);

  useEffect(() => {
    if (!active || !video) return;
    let stopped = false;
    let ticks = 0;
    const started = performance.now();
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const current = frameRef.current;
      if (!current || current.videoWidth <= 0) return;
      const probes = [current.nose, current.leftShoulder, current.rightShoulder].filter((point): point is { x: number; y: number } => Boolean(point));
      void readPersonMask(video, performance.now(), probes).then((mask) => {
        if (stopped || !mask) return;
        const traced = outlineFromMask(mask, current, mode);
        if (traced.points) setPoints(traced.points);
        ticks += 1;
        const seconds = (performance.now() - started) / 1000;
        if (seconds > 0.4) setSeen(Math.max(1, Math.round(ticks / seconds)));
      });
    }, Math.max(80, 1000 / hz));
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [active, hz, mode, video]);

  return { points: active ? points : null, hz: seen };
}
