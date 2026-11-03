import { calibrationConfig, type FeatureKey } from './config';
import { extractFeatures, type ExternalSnapshot, type PrintFrame } from './features';
import { median } from '../lib/posture/baseline';
import { frameQuality } from './quality';

export function trimmedMean(values: number[], ratio = calibrationConfig.trimRatio): number {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return Number.NaN;
  const drop = Math.floor(sorted.length * ratio);
  const kept = drop === 0 ? sorted : sorted.slice(drop, sorted.length - drop);
  const used = kept.length > 0 ? kept : sorted;
  return used.reduce((sum, value) => sum + value, 0) / used.length;
}

/** Median absolute deviation, scaled so a normal spread matches a standard deviation. */
export function mad(values: number[], scale = calibrationConfig.madScale): number {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return Number.NaN;
  const center = median(finite);
  return median(finite.map((value) => Math.abs(value - center))) * scale;
}

export function aggregateFeature(values: number[]): { value: number; spread: number } | null {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return null;
  const value = finite.length < calibrationConfig.medianFallbackCount ? median(finite) : trimmedMean(finite);
  return { value, spread: mad(finite) };
}

export type CapturePhase = 'capturing' | 'extend' | 'ready' | 'fail';

/** 5 s lock, extend to 10 s when there are not enough good frames, then fail once. */
export function capturePhase(goodCount: number, elapsedMs: number): CapturePhase {
  if (elapsedMs < calibrationConfig.lockMs) return 'capturing';
  if (goodCount >= calibrationConfig.minGoodFrames) return 'ready';
  if (elapsedMs < calibrationConfig.lockExtendMs) return 'extend';
  return 'fail';
}

export function aggregateFrames(frames: PrintFrame[]): {
  goodCount: number;
  values: Partial<Record<FeatureKey, number>>;
  spread: Partial<Record<FeatureKey, number>>;
  external: ExternalSnapshot | null;
} {
  const good = frames.filter((frame) => frameQuality(frame) === null);
  const values: Partial<Record<FeatureKey, number>> = {};
  const spread: Partial<Record<FeatureKey, number>> = {};
  const extracted = good.map((frame) => extractFeatures(frame));
  const keys = Object.keys(calibrationConfig.floor) as FeatureKey[];
  for (const key of keys) {
    const series = extracted
      .map((item) => item.internal[key])
      .filter((value): value is number => typeof value === 'number');
    const stats = aggregateFeature(series);
    if (!stats) continue;
    values[key] = stats.value;
    spread[key] = stats.spread;
  }
  return { goodCount: good.length, values, spread, external: averageExternal(extracted.map((item) => item.external)) };
}

function averageExternal(items: ExternalSnapshot[]): ExternalSnapshot | null {
  if (items.length === 0) return null;
  const pick = (read: (item: ExternalSnapshot) => number): number => {
    const stats = aggregateFeature(items.map(read));
    return stats?.value ?? 0;
  };
  return {
    faceScale: pick((item) => item.faceScale),
    headX: pick((item) => item.headX),
    headY: pick((item) => item.headY),
    pitch: pick((item) => item.pitch),
    yaw: pick((item) => item.yaw),
    shoulderWidthPx: pick((item) => item.shoulderWidthPx),
  };
}
