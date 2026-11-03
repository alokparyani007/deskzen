import { calibrationConfig, type FeatureKey } from './config';
import { extractFeatures } from './features';
import type { FeatureBundle } from './print';
import type { Landmarks } from '../lib/posture/types';

const BASE_KEYS: FeatureKey[] = ['headDrop', 'leanIn', 'forwardHead'];

/**
 * Weighted distance from the saved print, in units of each feature's spread.
 * Shrug is used when the print has it. Otherwise rounding stands in.
 */
export function slouchAmount(frame: Landmarks, anchor: FeatureBundle): number {
  const internal = extractFeatures({ landmarks: frame }).internal;
  const keys: FeatureKey[] = [...BASE_KEYS];
  if (internal.shrug !== undefined && anchor.values.shrug !== undefined) keys.push('shrug');
  else keys.push('rounding');

  let weighted = 0;
  let total = 0;
  for (const key of keys) {
    const value = internal[key];
    const base = anchor.values[key];
    if (value === undefined || base === undefined || !Number.isFinite(value) || !Number.isFinite(base)) continue;
    const scale = Math.max(anchor.spread[key] ?? 0, calibrationConfig.floor[key]);
    if (scale <= 0) continue;
    weighted += (Math.abs(value - base) / scale) * calibrationConfig.fullWeight;
    total += calibrationConfig.fullWeight;
  }
  return total === 0 ? 0 : weighted / total;
}

/** True once samples stay on one side of the line for holdMs without a break. */
export function heldFor(
  samples: { tMs: number; amount: number }[],
  level: number,
  holdMs: number,
  above: boolean,
): boolean {
  let start: number | null = null;
  for (const sample of samples) {
    const match = above ? sample.amount >= level : sample.amount < level;
    if (!match) {
      start = null;
      continue;
    }
    if (start === null) start = sample.tMs;
    if (sample.tMs - start >= holdMs) return true;
  }
  return false;
}

export function smoothToward(previous: number | null, next: number, dtMs: number, smoothMs: number): number {
  if (previous === null || smoothMs <= 0) return next;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / smoothMs);
  return previous + (next - previous) * alpha;
}
