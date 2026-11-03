import { postureConfig } from './config';
import { tiltFromHorizontalDeg } from './signals';
import type { Point2D } from './types';

export interface OrbPoint {
  x: number;
  y: number;
}

export interface RingState {
  filledMs: number;
  done: boolean;
  paused: boolean;
}

export function initialRing(): RingState {
  return { filledMs: 0, done: false, paused: false };
}

/** Nose offset from the shoulder midpoint. (0, 0) sits in the target ring. */
export function headOffset(
  nose: Point2D | undefined,
  leftShoulder: Point2D | undefined,
  rightShoulder: Point2D | undefined,
  targetRatio = postureConfig.glow.targetHeadRatio,
): OrbPoint | null {
  if (!nose || !leftShoulder || !rightShoulder) return null;
  const width = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
  if (!(width > 1)) return null;
  const midX = (leftShoulder.x + rightShoulder.x) / 2;
  const midY = (leftShoulder.y + rightShoulder.y) / 2;
  const above = (midY - nose.y) / width;
  return { x: (nose.x - midX) / width, y: targetRatio - above };
}

export function smoothOrb(previous: OrbPoint | null, next: OrbPoint, dtSeconds: number, tau = postureConfig.glow.orbTauSeconds): OrbPoint {
  if (!previous) return next;
  if (!(dtSeconds > 0) || !(tau > 0)) return previous;
  const alpha = 1 - Math.exp(-dtSeconds / tau);
  return {
    x: previous.x + (next.x - previous.x) * alpha,
    y: previous.y + (next.y - previous.y) * alpha,
  };
}

export function shouldersLevel(left: Point2D | undefined, right: Point2D | undefined, maxDeg = postureConfig.calibration.shoulderLevelMaxDeg): boolean {
  if (!left || !right) return false;
  return Math.abs(tiltFromHorizontalDeg(left, right)) <= maxDeg;
}

export function orbInside(orb: OrbPoint, radius = postureConfig.glow.ringRadius): boolean {
  return Math.hypot(orb.x, orb.y) <= radius;
}

/** Filling pauses when the orb leaves. It does not start over. */
export function stepRing(state: RingState, inside: boolean, dtMs: number, fillMs = postureConfig.glow.ringFillMs): RingState {
  if (state.done) return { ...state, paused: false };
  if (!inside || !(dtMs > 0)) return { ...state, paused: !inside && !state.done };
  const filledMs = Math.min(fillMs, state.filledMs + dtMs);
  return { filledMs, done: filledMs >= fillMs, paused: false };
}

export function ringProgress(state: RingState, fillMs = postureConfig.glow.ringFillMs): number {
  if (fillMs <= 0) return 0;
  return Math.min(1, state.filledMs / fillMs);
}
