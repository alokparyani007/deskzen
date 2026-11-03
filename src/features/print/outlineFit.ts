import { denormalizeContour, silhouetteIsUsable, type Point, type Silhouette } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { landmarkBodyPoints } from './landmarkBody';

export interface FittedOutline {
  d: string;
  viewBox: string;
}

/** Real traced outline when it is usable, otherwise a path built from the saved landmarks. */
export function posturePrintPoints(silhouette: Silhouette | null | undefined, frames: readonly Landmarks[]): Point[] | null {
  if (silhouette && silhouetteIsUsable(silhouette)) return denormalizeContour(silhouette.points, silhouette.anchors);
  const frame = frames.find((item) => item.leftShoulder && item.rightShoulder);
  if (!frame) return null;
  return landmarkBodyPoints(frame);
}

/** Center the outline on its shoulder midpoint at one scale, mirrored like the camera. */
export function shoulderCenteredFit(points: readonly Point[], focus: { x: number; y: number; width: number }): FittedOutline | null {
  if (points.length < 3 || focus.width <= 0) return null;
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const scale = (400 * 0.46) / focus.width;
  const placed = points.map((point) => ({
    x: 200 + (focus.x - point.x) * scale,
    y: 250 + (point.y - focus.y) * scale,
  }));
  const d = placed.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ') + ' Z';
  return { d, viewBox: '0 0 400 520' };
}

/** Fit the viewBox to the outline and mirror x so it matches the camera. */
export function mirroredFit(points: readonly Point[], pad = 0.08): FittedOutline | null {
  if (points.length < 3) return null;
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return null;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const mid = (minX + maxX) / 2;
  const flip = (x: number) => mid * 2 - x;
  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${flip(point.x)} ${point.y}`).join(' ') + ' Z';
  const padX = width * pad;
  const padY = height * pad;
  return { d, viewBox: `${minX - padX} ${minY - padY} ${width + padX * 2} ${height + padY * 2}` };
}
