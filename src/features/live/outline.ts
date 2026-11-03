import type { LockedPose } from '../../calibration/lockedPose';
import type { Landmarks } from '../../lib/posture/types';
import { denormalizeContour, type Point, type Silhouette } from '../../lib/posture/silhouette';
import { videoToScreen } from '../../lib/vision/toScreen';
import { anchorsFromLandmarks } from '../print/contourSample';

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Camera pixel to the mirrored object-cover preview.
 * The video element is scaled with object-cover and flipped with scaleX(-1).
 */
export function toScreen(
  xPx: number,
  yPx: number,
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number,
): ScreenPoint {
  return videoToScreen(xPx, yPx, videoWidth, videoHeight, viewWidth, viewHeight);
}

export function smoothPoints(previous: ScreenPoint[] | null, next: ScreenPoint[], alpha = 0.2): ScreenPoint[] {
  if (!previous || previous.length !== next.length) return next.map((point) => ({ x: point.x, y: point.y }));
  return next.map((point, index) => {
    const prior = previous[index] ?? point;
    return { x: prior.x + alpha * (point.x - prior.x), y: prior.y + alpha * (point.y - prior.y) };
  });
}

export function pointsToPath(points: ScreenPoint[]): string {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ') + ' Z';
}

export function headCenter(points: ScreenPoint[]): ScreenPoint | null {
  if (points.length === 0) return null;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const cutoff = minY + (maxY - minY) * 0.35;
  const head = points.filter((point) => point.y <= cutoff);
  const used = head.length > 0 ? head : points;
  const total = used.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / used.length, y: total.y / used.length };
}

/** Fraction of the view between two points. Within 4% means the arrow stays hidden. */
export function headGap(from: ScreenPoint, to: ScreenPoint, viewWidth: number, viewHeight: number): number {
  return Math.hypot((from.x - to.x) / Math.max(1, viewWidth), (from.y - to.y) / Math.max(1, viewHeight));
}

export function showGuideArrow(percent: number, gap: number): boolean {
  return percent < 80 && gap > 0.04;
}

export function curveArrow(from: ScreenPoint, to: ScreenPoint): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const bend = Math.min(48, len * 0.22);
  const cx = (from.x + to.x) / 2 + (-dy / len) * bend;
  const cy = (from.y + to.y) / 2 + (dx / len) * bend;
  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
}

export function arrowHead(from: ScreenPoint, to: ScreenPoint, size = 16): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const left = tip(to, angle + Math.PI * 0.8, size);
  const right = tip(to, angle - Math.PI * 0.8, size);
  return `M ${left.x.toFixed(2)} ${left.y.toFixed(2)} Q ${to.x.toFixed(2)} ${to.y.toFixed(2)} ${right.x.toFixed(2)} ${right.y.toFixed(2)}`;
}

/** Head ellipse from the saved ears, eyes, and nose, plus a neck taper and shoulder curve. */
export function landmarkOutlinePoints(pose: LockedPose): ScreenPoint[] {
  const head = coachHead(pose);
  const left = pose.leftShoulder;
  const right = pose.rightShoulder;
  const midX = (left.x + right.x) / 2;
  const shoulderY = (left.y + right.y) / 2;
  const span = Math.max(0.04, Math.abs(right.x - left.x));
  const jawY = head.cy + head.ry * 0.55;
  const neck = Math.max(head.rx * 0.42, span * 0.12);
  const points: ScreenPoint[] = [];
  const steps = 22;
  const start = Math.PI * 1.12;
  const end = -Math.PI * 0.12;
  for (let index = 0; index <= steps; index += 1) {
    const theta = start + ((end - start) * index) / steps;
    points.push({ x: head.cx + Math.cos(theta) * head.rx, y: head.cy - Math.sin(theta) * head.ry });
  }
  points.push({ x: midX + neck, y: jawY + (shoulderY - jawY) * 0.45 });
  points.push({ x: right.x, y: right.y });
  points.push({ x: right.x, y: right.y + span * 0.18 });
  points.push({ x: midX, y: shoulderY + span * 0.22 });
  points.push({ x: left.x, y: left.y + span * 0.18 });
  points.push({ x: left.x, y: left.y });
  points.push({ x: midX - neck, y: jawY + (shoulderY - jawY) * 0.45 });
  return chaikin(points);
}

export interface OutlineAnchor {
  scale: number;
  x: number;
  y: number;
}

/**
 * Move the saved shoulder midpoint to the live shoulder line and scale by shoulder width.
 * Points stay in video pixels. Posture differences stay in the shape.
 */
export function anchorOutline(
  points: ScreenPoint[],
  savedMid: ScreenPoint,
  savedWidth: number,
  liveMidX: number,
  shoulderLineY: number,
  liveWidth: number,
): ScreenPoint[] {
  const scale = savedWidth > 1e-4 ? liveWidth / savedWidth : 1;
  return applyAnchor(points, savedMid, { scale, x: liveMidX, y: shoulderLineY });
}

export function applyAnchor(points: ScreenPoint[], savedMid: ScreenPoint, anchor: OutlineAnchor): ScreenPoint[] {
  return points.map((point) => ({
    x: anchor.x + (point.x - savedMid.x) * anchor.scale,
    y: anchor.y + (point.y - savedMid.y) * anchor.scale,
  }));
}

/** Ease scale and position. 0.2 keeps the outline from jittering without hiding a posture change. */
export function smoothAnchor(previous: OutlineAnchor | null, next: OutlineAnchor, alpha = 0.2): OutlineAnchor {
  if (!previous) return { scale: next.scale, x: next.x, y: next.y };
  return {
    scale: previous.scale + alpha * (next.scale - previous.scale),
    x: previous.x + alpha * (next.x - previous.x),
    y: previous.y + alpha * (next.y - previous.y),
  };
}

export function placeOnShoulders(points: ScreenPoint[], pose: LockedPose, frame: Landmarks): ScreenPoint[] | null {
  if (!frame.leftShoulder || !frame.rightShoulder) return null;
  const savedMid = { x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2, y: (pose.leftShoulder.y + pose.rightShoulder.y) / 2 };
  const savedWidth = Math.hypot(pose.rightShoulder.x - pose.leftShoulder.x, pose.rightShoulder.y - pose.leftShoulder.y);
  if (savedWidth < 1e-4) return null;
  const liveMid = { x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2, y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2 };
  const liveWidth = Math.hypot(frame.rightShoulder.x - frame.leftShoulder.x, frame.rightShoulder.y - frame.leftShoulder.y);
  return points.map((point) => {
    const localX = (point.x - savedMid.x) / savedWidth;
    const localY = (point.y - savedMid.y) / savedWidth;
    return { x: liveMid.x - localX * liveWidth, y: liveMid.y + localY * liveWidth };
  });
}

export function poseToVideo(points: ScreenPoint[], pose: LockedPose): ScreenPoint[] {
  return points.map((point) => ({ x: (1 - point.x) * pose.videoWidth, y: point.y * pose.videoHeight }));
}

export function silhouetteVideoPoints(silhouette: Silhouette, frame: Landmarks | null): Point[] {
  const anchors = (frame ? anchorsFromLandmarks(frame) : null) ?? silhouette.anchors;
  return denormalizeContour(silhouette.points, anchors);
}

export function genericOutline(viewWidth: number, viewHeight: number): ScreenPoint[] {
  const cx = viewWidth * 0.5;
  const cy = viewHeight * 0.36;
  const rx = viewWidth * 0.075;
  const ry = viewHeight * 0.13;
  const span = viewWidth * 0.2;
  const shoulderY = cy + ry * 1.45;
  const points: ScreenPoint[] = [];
  const steps = 20;
  for (let index = 0; index <= steps; index += 1) {
    const theta = Math.PI * 1.12 + ((-Math.PI * 1.24) * index) / steps;
    points.push({ x: cx + Math.cos(theta) * rx, y: cy - Math.sin(theta) * ry });
  }
  const neck = rx * 0.45;
  const jawY = cy + ry * 0.55;
  points.push({ x: cx + neck, y: jawY + (shoulderY - jawY) * 0.45 });
  points.push({ x: cx + span, y: shoulderY });
  points.push({ x: cx + span, y: shoulderY + span * 0.22 });
  points.push({ x: cx, y: shoulderY + span * 0.28 });
  points.push({ x: cx - span, y: shoulderY + span * 0.22 });
  points.push({ x: cx - span, y: shoulderY });
  points.push({ x: cx - neck, y: jawY + (shoulderY - jawY) * 0.45 });
  return chaikin(points);
}

function coachHead(pose: LockedPose): { cx: number; cy: number; rx: number; ry: number } {
  const top = pose.headTop?.y ?? Math.min(pose.leftEye.y, pose.rightEye.y) - 0.05;
  const bottom = Math.max(pose.chin?.y ?? 0, pose.nose.y + 0.03, pose.leftEar?.y ?? 0, pose.rightEar?.y ?? 0);
  const left = Math.min(pose.leftFace?.x ?? pose.leftEye.x, pose.leftEar?.x ?? pose.leftEye.x, pose.leftEye.x);
  const right = Math.max(pose.rightFace?.x ?? pose.rightEye.x, pose.rightEar?.x ?? pose.rightEye.x, pose.rightEye.x);
  return {
    cx: (left + right) / 2,
    cy: (top + bottom) / 2,
    rx: Math.max(0.02, (right - left) / 2),
    ry: Math.max(0.02, (bottom - top) / 2),
  };
}

function chaikin(points: ScreenPoint[]): ScreenPoint[] {
  const next: ScreenPoint[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] ?? points[0]!;
    const following = points[(index + 1) % points.length] ?? current;
    next.push({ x: current.x * 0.75 + following.x * 0.25, y: current.y * 0.75 + following.y * 0.25 });
    next.push({ x: current.x * 0.25 + following.x * 0.75, y: current.y * 0.25 + following.y * 0.75 });
  }
  return next;
}

function tip(origin: ScreenPoint, angle: number, size: number): ScreenPoint {
  return { x: origin.x + Math.cos(angle) * size, y: origin.y + Math.sin(angle) * size };
}
