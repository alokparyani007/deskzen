import type { GlowOutline } from './glowOutline';
import type { GlowStat } from './glowStats';

export async function sharePrintCard(zen: GlowOutline | null, slouch: GlowOutline | null, stats: GlowStat[]): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue('--color-ink').trim() || '#0f172a';
  const print = style.getPropertyValue('--color-print').trim() || '#059669';
  const glow = style.getPropertyValue('--color-glow').trim() || '#f59e0b';
  const tint = style.getPropertyValue('--color-brand-tint').trim() || '#ecfdf5';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = tint;
  ctx.fillRect(70, 220, 940, 720);
  drawOutline(ctx, zen, 260, 360, 240, print, false);
  drawOutline(ctx, slouch, 620, 360, 240, glow, true);
  try {
    const logo = new Image();
    logo.src = '/brand/deskzen-icon.svg';
    await logo.decode();
    ctx.drawImage(logo, 80, 70, 72, 72);
  } catch {
    /* The card still shares without the icon. */
  }
  ctx.fillStyle = ink;
  ctx.font = '64px Inter, sans-serif';
  ctx.fillText('DeskZen', 170, 120);
  ctx.font = '36px Inter, sans-serif';
  ctx.fillStyle = print;
  ctx.fillText('Find your Zen', 80, 190);
  ctx.fillStyle = ink;
  ctx.font = '32px Inter, sans-serif';
  stats.forEach((stat, index) => {
    const detail = stat.label.startsWith('Head') ? 'higher' : stat.label.startsWith('Shoulders') ? 'more open' : 'farther from the screen';
    ctx.fillText(`${stat.label} ${stat.inches.toFixed(1)} in ${detail}`, 80, 1020 + index * 56);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((item) => resolve(item), 'image/png'));
  if (!blob) return;
  const file = new File([blob], 'deskzen-glow-up.png', { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({ files: [file], title: 'DeskZen', text: 'Find your Zen' });
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'deskzen-glow-up.png';
  link.click();
  URL.revokeObjectURL(link.href);
}

function drawOutline(ctx: CanvasRenderingContext2D, outline: GlowOutline | null, x: number, y: number, size: number, color: string, dashed: boolean): void {
  if (!outline) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.02;
  ctx.setLineDash(dashed ? [0.04, 0.03] : []);
  ctx.beginPath();
  ctx.ellipse(outline.head.cx, outline.head.cy, Math.max(0.02, outline.head.rx), Math.max(0.02, outline.head.ry), 0, 0, Math.PI * 2);
  ctx.moveTo(outline.neck.x, outline.head.cy + outline.head.ry);
  ctx.lineTo(outline.neck.x, outline.neck.y);
  ctx.moveTo(outline.leftShoulder.x, outline.leftShoulder.y);
  ctx.lineTo(outline.neck.x, outline.neck.y);
  ctx.lineTo(outline.rightShoulder.x, outline.rightShoulder.y);
  ctx.lineTo(outline.torso.x, outline.torso.y);
  ctx.stroke();
  ctx.restore();
}
