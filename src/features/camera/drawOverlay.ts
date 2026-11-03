import { ghostPoint } from '../../lib/posture/baseline';
import { postureConfig } from '../../lib/posture/config';
import { focalPxFromWidth } from '../../lib/posture/signals';
import type { GuideFill } from '../../lib/posture/glow';
import type { Alignment, Baseline, Landmarks, Point2D } from '../../lib/posture/types';

interface DrawInput {
  landmarks: Landmarks | null;
  alignment: Alignment | null;
  baseline: Baseline | null;
  showGuides: boolean;
  showGhost: boolean;
  holdProgress?: number;
  guideFill?: GuideFill;
}

export function drawOverlay(canvas: HTMLCanvasElement, input: DrawInput): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const brand = cssColor('--color-brand', '#047857');
  const glow = cssColor('--color-glow', '#f59e0b');

  if (input.showGuides) {
    drawSilhouette(ctx, width, height, input.guideFill ?? fullFill(input.alignment?.allGreen ?? false), input.holdProgress ?? 0, brand, glow);
  }
  if (input.showGhost && input.baseline) drawGhost(ctx, input.baseline, width, height, brand);
  if (input.landmarks) drawLive(ctx, input.landmarks, brand, glow);
}

function fullFill(on: boolean): GuideFill {
  return { head: on, shoulders: on, distance: on, light: on };
}

function drawSilhouette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fill: GuideFill,
  progress: number,
  brand: string,
  glow: string,
): void {
  const { calibration } = postureConfig;
  const cx = width / 2;
  const eyeY = height * calibration.eyeLineYRatio;
  const shoulderY = height * calibration.shoulderLineYRatio;
  const shoulderPx = Math.min(width * 0.72, expectedShoulderPx(width));
  const headY = eyeY - height * 0.02;
  const headRx = shoulderPx * 0.22;
  const headRy = height * 0.16;
  const left = cx - shoulderPx / 2;
  const right = cx + shoulderPx / 2;

  const strokePart = (on: boolean, draw: () => void) => {
    ctx.save();
    ctx.globalAlpha = on ? 0.9 : 0.22;
    ctx.strokeStyle = brand;
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = brand;
    ctx.shadowBlur = on && fill.light ? 18 : 0;
    ctx.setLineDash([]);
    ctx.beginPath();
    draw();
    ctx.stroke();
    ctx.restore();
  };

  strokePart(fill.head, () => {
    ctx.ellipse(cx, headY, headRx, headRy, 0, 0, Math.PI * 2);
  });
  strokePart(fill.shoulders, () => {
    ctx.moveTo(left, shoulderY + height * 0.07);
    ctx.quadraticCurveTo(left, shoulderY - height * 0.07, cx, eyeY + height * 0.11);
    ctx.quadraticCurveTo(right, shoulderY - height * 0.07, right, shoulderY + height * 0.07);
  });
  strokePart(fill.distance, () => {
    ctx.moveTo(left + 20, shoulderY + height * 0.12);
    ctx.quadraticCurveTo(cx, shoulderY + height * 0.2, right - 20, shoulderY + height * 0.12);
  });

  if (progress <= 0) return;
  const top = headY - headRy;
  const bottom = shoulderY + height * 0.1;
  const midY = (top + bottom) / 2;
  const ry = (bottom - top) / 2 + 16;
  const rx = shoulderPx / 2 + 26;
  const length = ellipseLength(rx, ry);
  ctx.save();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.shadowColor = glow;
  ctx.shadowBlur = 16;
  ctx.setLineDash([length * progress, length]);
  ctx.translate(cx, midY);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function ellipseLength(rx: number, ry: number): number {
  const h = (rx - ry) ** 2 / (rx + ry) ** 2;
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

function drawGhost(
  ctx: CanvasRenderingContext2D,
  baseline: Baseline,
  width: number,
  height: number,
  brand: string,
): void {
  const nose = ghostPoint(baseline.nose, width, height);
  const leftEye = ghostPoint(baseline.leftEye, width, height);
  const rightEye = ghostPoint(baseline.rightEye, width, height);
  const leftShoulder = ghostPoint(baseline.leftShoulder, width, height);
  const rightShoulder = ghostPoint(baseline.rightShoulder, width, height);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = brand;
  ctx.fillStyle = brand;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(leftEye.x, leftEye.y);
  ctx.lineTo(rightEye.x, rightEye.y);
  ctx.moveTo(leftShoulder.x, leftShoulder.y);
  ctx.lineTo(rightShoulder.x, rightShoulder.y);
  ctx.moveTo(nose.x, nose.y);
  ctx.lineTo((leftShoulder.x + rightShoulder.x) / 2, (leftShoulder.y + rightShoulder.y) / 2);
  ctx.stroke();
  for (const point of [nose, leftEye, rightEye, leftShoulder, rightShoulder]) {
    dot(ctx, point, 4);
  }
  ctx.restore();
}

function drawLive(ctx: CanvasRenderingContext2D, landmarks: Landmarks, brand: string, glow: string): void {
  ctx.save();
  ctx.strokeStyle = brand;
  ctx.fillStyle = brand;
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  if (landmarks.leftEye && landmarks.rightEye) {
    ctx.beginPath();
    ctx.moveTo(landmarks.leftEye.x, landmarks.leftEye.y);
    ctx.lineTo(landmarks.rightEye.x, landmarks.rightEye.y);
    ctx.stroke();
  }
  if (landmarks.leftShoulder && landmarks.rightShoulder) {
    ctx.beginPath();
    ctx.moveTo(landmarks.leftShoulder.x, landmarks.leftShoulder.y);
    ctx.lineTo(landmarks.rightShoulder.x, landmarks.rightShoulder.y);
    ctx.stroke();
  }
  const points = [
    landmarks.nose,
    landmarks.leftEye,
    landmarks.rightEye,
    landmarks.leftEar,
    landmarks.rightEar,
    landmarks.leftShoulder,
    landmarks.rightShoulder,
  ];
  for (const point of points) {
    if (point) dot(ctx, point, 5);
  }
  ctx.fillStyle = glow;
  if (landmarks.leftIrisCenter) dot(ctx, landmarks.leftIrisCenter, 3);
  if (landmarks.rightIrisCenter) dot(ctx, landmarks.rightIrisCenter, 3);
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, point: Point2D, radius: number): void {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function expectedShoulderPx(videoWidth: number): number {
  const focal = focalPxFromWidth(videoWidth);
  const distanceMm = postureConfig.calibration.targetDistanceIn * 25.4;
  return (focal * postureConfig.guideShoulderMm) / distanceMm;
}

function cssColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}
