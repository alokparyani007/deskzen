import type { NormPoint } from '../../lib/posture/types';
import { zenConfig } from './zenConfig';

export interface FitLandmarks {
  nose: NormPoint | null;
  eyeMid: NormPoint | null;
  leftShoulder: NormPoint | null;
  rightShoulder: NormPoint | null;
  shoulderWidth: number | null;
}

export interface FitSaved {
  outline: NormPoint[] | null;
  landmarks: FitLandmarks | null;
}

export interface FitLive {
  outline: NormPoint[] | null;
  landmarks: FitLandmarks | null;
  rulesPassed: number;
  rulesTotal: number;
}

export interface FitParts {
  iou: number | null;
  landmark: number | null;
  rules: number | null;
  rulesPassed: number;
  rulesTotal: number;
  formula: 'full' | 'landmark';
}

export interface FitScore {
  percent: number | null;
  parts: FitParts;
}

export function polygonIou(left: readonly NormPoint[], right: readonly NormPoint[], gridW = zenConfig.fit.gridW, gridH = zenConfig.fit.gridH): number {
  if (left.length < 3 || right.length < 3) return 0;
  let both = 0;
  let either = 0;
  for (let row = 0; row < gridH; row += 1) {
    for (let col = 0; col < gridW; col += 1) {
      const point = { x: (col + 0.5) / gridW, y: (row + 0.5) / gridH };
      const inLeft = pointInPolygon(point, left);
      const inRight = pointInPolygon(point, right);
      if (inLeft || inRight) either += 1;
      if (inLeft && inRight) both += 1;
    }
  }
  return either === 0 ? 1 : both / either;
}

export function landmarkScore(saved: FitLandmarks, live: FitLandmarks): number | null {
  const width = saved.shoulderWidth;
  if (width === null || !(width > 0)) return null;
  const pairs = [
    [saved.nose, live.nose],
    [saved.eyeMid, live.eyeMid],
    [saved.leftShoulder, live.leftShoulder],
    [saved.rightShoulder, live.rightShoulder],
  ] as const;
  const distances: number[] = [];
  for (const [from, to] of pairs) {
    if (!from || !to) continue;
    distances.push(Math.hypot(to.x - from.x, to.y - from.y) / width);
  }
  if (distances.length === 0) return null;
  const mean = distances.reduce((sum, value) => sum + value, 0) / distances.length;
  return clamp((1 - mean / zenConfig.fit.landmarkReach) , 0, 1);
}

export function fitScore(saved: FitSaved | null, live: FitLive | null): FitScore {
  const empty: FitParts = { iou: null, landmark: null, rules: null, rulesPassed: 0, rulesTotal: 0, formula: 'full' };
  if (!saved || !live?.landmarks) return { percent: null, parts: empty };
  const marks = saved.landmarks ? landmarkScore(saved.landmarks, live.landmarks) : null;
  const rules = live.rulesTotal > 0 ? live.rulesPassed / live.rulesTotal : null;
  const iou = saved.outline && live.outline && saved.outline.length >= 3 && live.outline.length >= 3 ? polygonIou(saved.outline, live.outline) : null;
  if (iou === null) {
    if (marks === null) return { percent: null, parts: { ...empty, rules, rulesPassed: live.rulesPassed, rulesTotal: live.rulesTotal, formula: 'landmark' } };
    const rulesPart = rules ?? 1;
    const percent = 100 * (zenConfig.fit.landmarkOnly.landmark * marks + zenConfig.fit.landmarkOnly.rules * rulesPart);
    return {
      percent,
      parts: { iou: null, landmark: marks, rules, rulesPassed: live.rulesPassed, rulesTotal: live.rulesTotal, formula: 'landmark' },
    };
  }
  const iouPart = clamp((iou - zenConfig.fit.iouLow) / (zenConfig.fit.iouHigh - zenConfig.fit.iouLow), 0, 1);
  const markPart = marks ?? 0;
  const rulesPart = rules ?? 0;
  const percent = 100 * (zenConfig.fit.iou * iouPart + zenConfig.fit.landmark * markPart + zenConfig.fit.rules * rulesPart);
  return {
    percent,
    parts: { iou, landmark: marks, rules, rulesPassed: live.rulesPassed, rulesTotal: live.rulesTotal, formula: 'full' },
  };
}

export function smoothFit(previous: number | null, next: number | null, alpha = zenConfig.fit.ema): number | null {
  if (next === null) return previous;
  if (previous === null) return next;
  return previous + alpha * (next - previous);
}

export interface HoldRingState {
  heldMs: number;
  dipSince: number | null;
  lastMs: number | null;
}

export function initialHold(): HoldRingState {
  return { heldMs: 0, dipSince: null, lastMs: null };
}

export function stepHoldRing(state: HoldRingState, nowMs: number, fit: number | null, good = zenConfig.fitGood, holdMs = zenConfig.fitHoldMs): HoldRingState & { done: boolean; fraction: number } {
  const last = state.lastMs;
  const dt = last === null ? 0 : Math.max(0, nowMs - last);
  let held = state.heldMs;
  let dip = state.dipSince;
  const high = fit !== null && fit >= good;
  if (high) {
    if (dip !== null) {
      if (nowMs - dip >= zenConfig.fitDipResetMs) held = 0;
      dip = null;
    } else {
      held += dt;
    }
  } else if (dip === null) {
    dip = nowMs;
  } else if (nowMs - dip >= zenConfig.fitDipResetMs) {
    held = 0;
  }
  const fraction = clamp(held / holdMs, 0, 1);
  return { heldMs: held, dipSince: dip, lastMs: nowMs, done: held >= holdMs, fraction };
}

export function pointInPolygon(point: NormPoint, polygon: readonly NormPoint[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index] ?? polygon[0]!;
    const prior = polygon[previous] ?? current;
    const crosses = current.y > point.y !== prior.y > point.y;
    if (!crosses) continue;
    const x = ((prior.x - current.x) * (point.y - current.y)) / (prior.y - current.y + 0) + current.x;
    if (point.x < x) inside = !inside;
  }
  return inside;
}

/** True when a live point sits outside the saved outline, past the tolerance band. */
export function outsideOutline(point: NormPoint, polygon: readonly NormPoint[], tolerance = zenConfig.outlineBand): boolean {
  if (polygon.length < 3) return false;
  if (pointInPolygon(point, polygon)) return false;
  let nearest = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index] ?? polygon[0]!;
    const end = polygon[(index + 1) % polygon.length] ?? start;
    nearest = Math.min(nearest, segmentDistance(point, start, end));
  }
  return nearest > tolerance;
}

function segmentDistance(point: NormPoint, start: NormPoint, end: NormPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const mix = length === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / length, 0, 1);
  return Math.hypot(point.x - (start.x + dx * mix), point.y - (start.y + dy * mix));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
