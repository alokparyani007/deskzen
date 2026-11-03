import { calibrationConfig, type FeatureKey } from './config';

export interface FeatureThreshold {
  feature: FeatureKey;
  deadband: number;
  slouchDelta: number;
  threshold: number;
  weight: number;
}

export function deadbandFor(feature: FeatureKey, spread: number): number {
  return Math.max(calibrationConfig.floor[feature], calibrationConfig.deadbandMultiplier * spread);
}

/**
 * Alert line from the reset value and the slouch sample.
 * The step away from the reset is clamped between the deadband and the default threshold.
 */
export function thresholdFromSlouch(feature: FeatureKey, baseline: number, slouch: number, spread: number): FeatureThreshold {
  const slouchDelta = slouch - baseline;
  const deadband = deadbandFor(feature, spread);
  const cap = calibrationConfig.defaultThreshold[feature];
  const low = Math.min(deadband, cap);
  const high = Math.max(deadband, cap);
  const raw = calibrationConfig.slouchK * slouchDelta;
  const sign = raw < 0 ? -1 : 1;
  const magnitude = Math.min(high, Math.max(low, Math.abs(raw)));
  const weak = Math.abs(slouchDelta) < calibrationConfig.weakSpreadMultiplier * spread;
  return {
    feature,
    deadband,
    slouchDelta,
    threshold: baseline + magnitude * sign,
    weight: weak ? calibrationConfig.weakWeight : calibrationConfig.fullWeight,
  };
}

export function defaultThreshold(feature: FeatureKey, baseline: number): number {
  return baseline + calibrationConfig.defaultThreshold[feature];
}
