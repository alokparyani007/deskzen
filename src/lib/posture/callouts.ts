import { postureConfig } from './config';
import { inchesFromBest } from './readSignals';
import type { Baseline, SignalReadings } from './types';

export interface LiveCallouts {
  issues: string[];
  positives: string[];
}

export function liveCallouts(readings: SignalReadings, baseline: Baseline): LiveCallouts {
  const issues: string[] = [];
  if ((readings.leanDev ?? 0) > postureConfig.deadZone.lean) {
    const inches = inchesFromBest(baseline, readings);
    issues.push(inches && inches > 0 ? `Leaning in ${inches} in` : 'Leaning in');
  }
  if ((readings.headDropDev ?? 0) > postureConfig.deadZone.headDrop) issues.push('Head dropped');
  if ((readings.shoulderDev ?? 0) > postureConfig.deadZone.shoulders) issues.push('Shoulders rounded');
  if ((readings.tiltDevDeg ?? 0) > postureConfig.deadZone.tilt) issues.push('Head tilted');

  if (issues.length > 0) return { issues, positives: [] };

  const positives: string[] = [];
  if ((readings.tiltDevDeg ?? 0) <= postureConfig.deadZone.tilt) positives.push('Eye level with screen');
  if ((readings.shoulderDev ?? 99) <= postureConfig.deadZone.shoulders) positives.push('Shoulders relaxed');
  if (readings.screenDistanceIn !== undefined) {
    positives.push(`${Math.round(readings.screenDistanceIn)} in from screen`);
  }
  return { issues, positives };
}
