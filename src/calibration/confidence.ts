import { calibrationConfig } from './config';
import type { QualityIssue } from './quality';

export interface ConfidenceParts {
  goodFrameRatio: number;
  stillness: number;
  meanVisibility: number;
  lighting: number;
  framing: number;
}

export type ConfidenceDecision = 'save' | 'save-with-tip' | 'retry';

export function confidenceScore(parts: ConfidenceParts): number {
  const { confidence } = calibrationConfig;
  const score =
    confidence.goodFrames * unit(parts.goodFrameRatio) +
    confidence.stillness * unit(parts.stillness) +
    confidence.visibility * unit(parts.meanVisibility) +
    confidence.lighting * unit(parts.lighting) +
    confidence.framing * unit(parts.framing);
  return Math.round(score * 10) / 10;
}

export function confidenceDecision(score: number): ConfidenceDecision {
  if (score >= calibrationConfig.confidence.saveAt) return 'save';
  if (score >= calibrationConfig.confidence.tipAt) return 'save-with-tip';
  return 'retry';
}

export function confidenceTip(issue: QualityIssue | null): string {
  if (issue === 'light') return 'A little more light on your face will make the next check surer.';
  if (issue === 'motion') return 'Holding still a moment longer will make the next check surer.';
  if (issue === 'shoulders' || issue === 'faces' || issue === 'yaw' || issue === 'roll') {
    return 'A clearer view of your shoulders and face will make the next check surer.';
  }
  return 'One more try, with you centered in the frame, will make this surer.';
}

function unit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
