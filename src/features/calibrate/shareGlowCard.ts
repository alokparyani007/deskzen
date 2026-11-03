import type { Baseline } from '../../lib/posture/types';

export function shareGlowCard(before: Baseline | null, glowBaseline: Baseline, lines: string[]): void {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const brand = cssColor('--color-brand', 'CanvasText');
  const glow = cssColor('--color-glow', 'CanvasText');
  const ink = cssColor('--color-ink', 'CanvasText');
  const muted = cssColor('--color-ink-muted', 'GrayText');
  ctx.fillStyle = cssColor('--color-surface', 'Canvas');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'white';
  ctx.fillRect(24, 24, canvas.width - 48, canvas.height - 48);
  ctx.fillStyle = brand;
  ctx.beginPath();
  ctx.arc(78, 64, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(78, 58, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = '700 28px sans-serif';
  ctx.fillText('DeskZen', 108, 72);
  ctx.font = '600 22px sans-serif';
  ctx.fillStyle = brand;
  ctx.fillText('Your Glow-up', 64, 130);
  drawFigure(ctx, before, 250, 250, muted);
  drawFigure(ctx, glowBaseline, 620, 250, brand);
  ctx.font = '600 18px sans-serif';
  ctx.fillStyle = muted;
  ctx.fillText('Before', 210, 430);
  ctx.fillStyle = brand;
  ctx.fillText('Your Glow', 560, 430);
  ctx.font = '600 20px sans-serif';
  ctx.fillStyle = ink;
  lines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 64, 490 + index * 32);
  });
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'deskzen-glow-up.png';
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

function cssColor(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function drawFigure(ctx: CanvasRenderingContext2D, baseline: Baseline | null, cx: number, cy: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (!baseline) {
    ctx.arc(cx, cy - 20, 28, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  const x = (value: number) => cx + (0.5 - value) * 220;
  const y = (value: number) => cy + (value - 0.45) * 260;
  ctx.ellipse(x(baseline.nose.x), y(baseline.nose.y) - 10, 26, 32, 0, 0, Math.PI * 2);
  ctx.moveTo(x(baseline.leftShoulder.x), y(baseline.leftShoulder.y));
  ctx.quadraticCurveTo(x(baseline.nose.x), y(baseline.nose.y) + 36, x(baseline.rightShoulder.x), y(baseline.rightShoulder.y));
  ctx.stroke();
}
