import { useEffect, useRef } from 'react';
import type { Landmarks } from '../../lib/posture/types';
import { toScreen } from '../../lib/vision/toScreen';
import { bodyOutlinePoints } from './bodyOutline';

const MAX_PARTICLES = 40;

/** Tiny lights that drift along the emerald outline while a posture locks in. */
export function LockParticles({ landmarks, reduced }: { landmarks: Landmarks | null; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarksRef = useRef(landmarks);
  landmarksRef.current = landmarks;

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    let frame = 0;
    const glow = cssColor('--color-brand-light');
    const seeds = Array.from({ length: MAX_PARTICLES }, (_, index) => ({
      along: index / MAX_PARTICLES,
      speed: 0.04 + (index % 5) * 0.012,
      size: 1.2 + (index % 4) * 0.45,
    }));
    const paint = (now: number) => {
      const current = landmarksRef.current;
      const points = bodyOutlinePoints(current);
      const videoWidth = current?.videoWidth ?? 0;
      const videoHeight = current?.videoHeight ?? 0;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx || width <= 0 || height <= 0 || points.length < 4 || videoWidth <= 0) {
        ctx?.clearRect(0, 0, width, height);
        frame = window.requestAnimationFrame(paint);
        return;
      }
      ctx.clearRect(0, 0, width, height);
      const seconds = now / 1000;
      ctx.fillStyle = glow;
      for (const seed of seeds) {
        const index = Math.floor(((seed.along + seconds * seed.speed) % 1) * (points.length - 1));
        const point = points[index];
        if (!point) continue;
        const placed = toScreen(point.x, point.y, videoWidth, videoHeight, width, height);
        ctx.beginPath();
        ctx.arc(placed.x * width, placed.y * height, seed.size, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frame);
  }, [reduced]);

  if (reduced) return null;
  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function cssColor(variable: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || 'rgb(16 185 129)';
}
