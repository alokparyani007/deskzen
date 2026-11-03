import { postureConfig } from './config';
import type { PostureScore, ScoreLabel, SignalKey, SignalReadings } from './types';

const KEYS: SignalKey[] = ['lean', 'headDrop', 'shoulders', 'tilt', 'distance'];

export function smoothToward(previous: number, raw: number, dtSeconds: number, tau = postureConfig.emaTauSeconds): number {
  const alpha = dtSeconds <= 0 ? 1 : 1 - Math.exp(-dtSeconds / tau);
  return previous + alpha * (raw - previous);
}

export function toneForLabel(label: ScoreLabel): 'good' | 'okay' | 'low' {
  if (label === 'okay') return 'okay';
  if (label === 'reset') return 'low';
  return 'good';
}

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function subScore(dev: number, deadZone: number, fullPenalty: number): number {
  if (dev <= deadZone) return 100;
  if (dev >= fullPenalty) return 0;
  const span = fullPenalty - deadZone;
  if (span <= 0) return dev <= deadZone ? 100 : 0;
  return 100 * (1 - smoothstep((dev - deadZone) / span));
}

export function labelFor(score: number): ScoreLabel {
  if (score >= 85) return 'great';
  if (score >= 70) return 'good';
  if (score >= 50) return 'okay';
  return 'reset';
}

export function labelText(label: ScoreLabel): string {
  if (label === 'great') return 'Great';
  if (label === 'good') return 'Good';
  if (label === 'okay') return 'Okay - sit back to glow';
  return 'Time to reset';
}

function deviation(readings: SignalReadings, key: SignalKey): number | undefined {
  if (key === 'lean') return readings.leanDev;
  if (key === 'headDrop') return readings.headDropDev;
  if (key === 'shoulders') return readings.shoulderDev;
  if (key === 'tilt') return readings.tiltDevDeg;
  return readings.distDev;
}

export function usedWeights(
  readings: SignalReadings,
  weightScale?: Partial<Record<SignalKey, number>>,
): Partial<Record<SignalKey, number>> {
  const present: Partial<Record<SignalKey, number>> = {};
  let sum = 0;
  for (const key of KEYS) {
    const dev = deviation(readings, key);
    if (dev === undefined || !Number.isFinite(dev)) continue;
    const weight = postureConfig.weights[key] * (weightScale?.[key] ?? 1);
    present[key] = weight;
    sum += weight;
  }
  if (sum <= 0) return {};
  const normalized: Partial<Record<SignalKey, number>> = {};
  for (const key of KEYS) {
    const weight = present[key];
    if (weight === undefined) continue;
    normalized[key] = weight / sum;
  }
  return normalized;
}

export function scoreFrame(
  readings: SignalReadings,
  previous: PostureScore | undefined,
  dtSeconds: number,
  quality = previous?.quality ?? 1,
  weightScale?: Partial<Record<SignalKey, number>>,
): PostureScore {
  const timestampMs = previous?.timestampMs ?? 0;
  if (readings.quality !== 'good') {
    if (previous) return { ...previous, quality };
    return { timestampMs, raw: 0, smoothed: 0, label: 'reset', subScores: {}, quality };
  }

  const weights = usedWeights(readings, weightScale);
  const subScores: Partial<Record<SignalKey, number>> = {};
  let raw = previous?.raw ?? 100;
  let weighted = 0;
  let weightSum = 0;
  for (const key of KEYS) {
    const weight = weights[key];
    const dev = deviation(readings, key);
    if (weight === undefined || dev === undefined) continue;
    const score = subScore(dev, postureConfig.deadZone[key], postureConfig.fullPenalty[key]);
    subScores[key] = score;
    weighted += weight * score;
    weightSum += weight;
  }
  if (weightSum > 0) raw = weighted / weightSum;
  const smoothed = previous ? smoothToward(previous.smoothed, raw, dtSeconds) : raw;
  let dominantIssue: SignalKey | undefined;
  let lowest = Number.POSITIVE_INFINITY;
  for (const key of KEYS) {
    const value = subScores[key];
    if (value === undefined) continue;
    const contribution = (weights[key] ?? 0) * value;
    if (contribution < lowest) {
      lowest = contribution;
      dominantIssue = key;
    }
  }
  return {
    timestampMs,
    raw,
    smoothed,
    label: labelFor(smoothed),
    subScores,
    dominantIssue: dominantIssue && (subScores[dominantIssue] ?? 100) < 100 ? dominantIssue : undefined,
    quality,
  };
}

export function nudgeCopy(issue: SignalKey | undefined, inchesCloser: number | undefined, distanceIn: number | undefined): string {
  if (issue === 'lean') {
    const inches = inchesCloser && inchesCloser > 0 ? inchesCloser : 1;
    return `Lean back a little - you're ${inches} in closer than your best.`;
  }
  if (issue === 'headDrop') return 'Lift your chin a touch.';
  if (issue === 'shoulders') return 'Let your shoulders drop.';
  if (issue === 'tilt') return 'Level your head.';
  if (issue === 'distance' && distanceIn !== undefined) {
    return `You're about ${Math.round(distanceIn)} in from your screen. Try sitting back to about 20-25 in.`;
  }
  return 'Sit tall, you\'ve got this.';
}
