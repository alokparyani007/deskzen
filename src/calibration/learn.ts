import { calibrationConfig, type FeatureKey } from './config';

export type LearnKind = 'steady' | 'corrected' | 'button';

export interface LearnProof {
  kind: LearnKind;
  holdMs: number;
  confidence?: number;
  inTopBand?: boolean;
}

/** Only a verified good moment may move the print. */
export function isVerifiedGood(proof: LearnProof): boolean {
  if (proof.kind === 'steady') {
    return proof.holdMs >= calibrationConfig.steadyHoldMs && (proof.confidence ?? 0) >= calibrationConfig.steadyConfidence && proof.inTopBand === true;
  }
  if (proof.kind === 'corrected') return proof.holdMs >= calibrationConfig.correctedHoldMs;
  return proof.holdMs >= calibrationConfig.buttonHoldMs;
}

/**
 * One learning step. Drift away from the slouch can reach 35% of slouchDelta.
 * Drift toward the slouch stops at 15%. A missing slouch delta does not move.
 */
export function nextCurrent(current: number, anchor: number, sample: number, slouchDelta: number): number {
  if (!Number.isFinite(slouchDelta) || slouchDelta === 0) return anchor;
  const proposed = current + calibrationConfig.learnAlpha * (sample - current);
  const toward = Math.sign(slouchDelta);
  const axis = (proposed - anchor) * toward;
  const maxToward = calibrationConfig.maxTowardSlouchRatio * Math.abs(slouchDelta);
  const maxAway = calibrationConfig.maxDriftRatio * Math.abs(slouchDelta);
  const limited = axis > 0 ? Math.min(axis, maxToward) : Math.max(axis, -maxAway);
  return anchor + limited * toward;
}

export function learnValues(
  current: Partial<Record<FeatureKey, number>>,
  anchor: Partial<Record<FeatureKey, number>>,
  sample: Partial<Record<FeatureKey, number>>,
  slouchDelta: Partial<Record<FeatureKey, number>>,
  proof: LearnProof,
): { values: Partial<Record<FeatureKey, number>>; tuned: boolean } {
  if (!isVerifiedGood(proof)) return { values: current, tuned: false };
  const values: Partial<Record<FeatureKey, number>> = { ...current };
  let tuned = false;
  for (const key of Object.keys(anchor) as FeatureKey[]) {
    const base = anchor[key];
    const observed = sample[key];
    if (base === undefined || observed === undefined) continue;
    const before = current[key] ?? base;
    const after = nextCurrent(before, base, observed, slouchDelta[key] ?? 0);
    values[key] = after;
    if (Math.abs(after - before) > 1e-9) tuned = true;
  }
  return { values, tuned };
}
