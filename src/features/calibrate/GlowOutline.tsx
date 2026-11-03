import { useEffect, useRef } from 'react';
import type { Baseline } from '../../lib/posture/types';

export function GlowOutline({ baseline }: { baseline: Baseline }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const x = (value: number) => (1 - value) * width;
    const y = (value: number) => value * height;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim();
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const nose = baseline.nose;
    ctx.beginPath();
    ctx.ellipse(x(nose.x), y(nose.y) - 8, 28, 36, 0, 0, Math.PI * 2);
    ctx.moveTo(x(baseline.leftShoulder.x), y(baseline.leftShoulder.y));
    ctx.quadraticCurveTo(x(nose.x), y(nose.y) + 28, x(baseline.rightShoulder.x), y(baseline.rightShoulder.y));
    ctx.stroke();
  }, [baseline]);

  return <canvas ref={canvasRef} width={180} height={140} className="mx-auto h-28 w-36" aria-hidden="true" />;
}
