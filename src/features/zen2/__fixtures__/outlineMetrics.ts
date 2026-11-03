import type { Landmarks, NormPoint } from '../../../lib/posture/types';
import type { Point } from '../../../lib/posture/silhouette';

/** Outline regions scored against the hand-checked ground truth (all in video px). */
export const REGIONS = ['hairTop', 'headSides', 'neck', 'shoulderL', 'shoulderR', 'arms'] as const;
export type Region = (typeof REGIONS)[number];

export interface RegionScore {
  /** Mean and max distance between the trace and the ground truth, % of frame height (both directions). */
  mean: number;
  max: number;
  count: number;
}

export interface OutlineScore {
  regions: Record<Region, RegionScore>;
  /** Traced area outside the ground truth above the upper arms (a chair), % of frame area. */
  chair: number;
  /** Ground-truth area the trace missed above the upper arms, % of frame area. */
  missing: number;
}

interface Geometry {
  cx: number;
  faceTop: number;
  fh: number;
  fw: number;
  chin: number;
  leftSX: number;
  rightSX: number;
  sy: number;
  sw: number;
  width: number;
  height: number;
}

function geometry(frame: Landmarks): Geometry {
  const box = frame.faceBox!;
  const width = frame.videoWidth;
  const height = frame.videoHeight;
  const a = frame.leftShoulder!;
  const b = frame.rightShoulder!;
  const fw = box.w * width;
  const fh = box.h * height;
  const faceTop = box.y * height;
  return {
    cx: (box.x + box.w / 2) * width,
    faceTop,
    fh,
    fw,
    chin: faceTop + fh,
    leftSX: Math.min(a.x, b.x),
    rightSX: Math.max(a.x, b.x),
    sy: (a.y + b.y) / 2,
    sw: Math.hypot(a.x - b.x, a.y - b.y),
    width,
    height,
  };
}

/** Region of one outline point, or null on the frame border (not part of the body line). */
export function regionOf(point: Point, g: Geometry): Region | null {
  // The bottom 5% of the frame is desk clutter and the frame edge, not the body line.
  if (point.y >= g.height * 0.95 || point.x <= g.width * 0.004 || point.x >= g.width * 0.996) return null;
  if (point.y < g.faceTop + 0.15 * g.fh) return 'hairTop';
  if (point.y < g.chin - 0.1 * g.fh) return 'headSides';
  if (point.y < g.chin + 0.1 * g.sw && Math.abs(point.x - g.cx) < 0.6 * g.fw) return 'neck';
  const left = point.x < g.cx;
  const reach = left ? g.cx - g.leftSX : g.rightSX - g.cx;
  if (Math.abs(point.x - g.cx) <= reach + 0.12 * g.sw && point.y < g.sy + 0.08 * g.sw) return left ? 'shoulderL' : 'shoulderR';
  return 'arms';
}

/** Points every `step` px along a closed loop. */
export function densify(points: readonly Point[], step: number): Point[] {
  const out: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k += 1) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** Distance from a point to a closed polyline. */
export function distanceToLoop(point: Point, loop: readonly Point[]): number {
  let best = Infinity;
  for (let index = 0; index < loop.length; index += 1) {
    const a = loop[index]!;
    const b = loop[(index + 1) % loop.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = dx * dx + dy * dy;
    const t = len > 0 ? Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len)) : 0;
    best = Math.min(best, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
  }
  return best;
}

function raster(loop: readonly Point[], width: number, height: number, cell: number): Uint8Array {
  const w = Math.ceil(width / cell);
  const h = Math.ceil(height / cell);
  const grid = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const py = (y + 0.5) * cell;
    const xs: number[] = [];
    for (let i = 0, j = loop.length - 1; i < loop.length; j = i, i += 1) {
      const a = loop[i]!;
      const b = loop[j]!;
      if (a.y > py !== b.y > py) xs.push(a.x + ((py - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k]! / cell - 0.5)); x < Math.min(w, Math.ceil(xs[k + 1]! / cell - 0.5)); x += 1) grid[y * w + x] = 1;
    }
  }
  return grid;
}

/** Score a traced outline (normalized, unmirrored) against the ground-truth loop in video px. */
export function scoreOutline(trace: readonly NormPoint[], truth: readonly Point[], frame: Landmarks): OutlineScore {
  const g = geometry(frame);
  const traced = trace.map((p) => ({ x: p.x * g.width, y: p.y * g.height }));
  const sums = Object.fromEntries(REGIONS.map((r) => [r, { total: 0, max: 0, count: 0 }])) as Record<Region, { total: number; max: number; count: number }>;
  const add = (points: readonly Point[], other: readonly Point[]) => {
    for (const point of points) {
      const region = regionOf(point, g);
      if (!region) continue;
      const d = (distanceToLoop(point, other) / g.height) * 100;
      const s = sums[region];
      s.total += d;
      s.max = Math.max(s.max, d);
      s.count += 1;
    }
  };
  add(densify(truth, 3), traced);
  add(densify(traced, 3), truth);
  const regions = Object.fromEntries(REGIONS.map((r) => [r, { mean: sums[r].count ? sums[r].total / sums[r].count : 0, max: sums[r].max, count: sums[r].count }])) as Record<Region, RegionScore>;
  const cell = 2;
  const a = raster(traced, g.width, g.height, cell);
  const b = raster(truth, g.width, g.height, cell);
  const w = Math.ceil(g.width / cell);
  const rows = Math.min(Math.ceil(g.height / cell), Math.ceil((g.sy + 0.3 * g.sw) / cell));
  let chair = 0;
  let missing = 0;
  for (let index = 0; index < rows * w; index += 1) {
    if (a[index] && !b[index]) chair += 1;
    if (b[index] && !a[index]) missing += 1;
  }
  const total = Math.ceil(g.width / cell) * Math.ceil(g.height / cell);
  return { regions, chair: (chair / total) * 100, missing: (missing / total) * 100 };
}

/** Ground-truth top edge (smallest y) at column x, or null. */
export function truthTopAt(truth: readonly Point[], x: number, fromY: number): number | null {
  let top = Infinity;
  for (let index = 0; index < truth.length; index += 1) {
    const a = truth[index]!;
    const b = truth[(index + 1) % truth.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    const y = a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
    if (y >= fromY && y < top) top = y;
  }
  return Number.isFinite(top) ? top : null;
}
