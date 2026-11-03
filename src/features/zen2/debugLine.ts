import type { Landmarks } from '../../lib/posture/types';
import type { PoseMeasures } from './poseRules';
import type { FitParts } from './fitScore';
import type { CoachPhase } from './liveCoach2';
import type { PoseMode } from './zenConfig';

export function formatZenDebug(input: {
  frame: Landmarks | null;
  mode: PoseMode;
  print: 'no' | 'yes' | 'v3';
  fit: number | null;
  parts: FitParts | null;
  measures: PoseMeasures | null;
  baselineNeck: number | null;
  baselineFace: number | null;
  phase: CoachPhase | string;
  segHz: number;
}): string {
  const frame = input.frame;
  const nose = frame?.nose?.visibility;
  const left = frame?.leftShoulder?.visibility;
  const right = frame?.rightShoulder?.visibility;
  const fit = input.fit === null ? '—' : String(Math.round(input.fit));
  const iou = input.parts?.iou === null || input.parts?.iou === undefined ? '—' : input.parts.iou.toFixed(2);
  const landmark = input.parts?.landmark === null || input.parts?.landmark === undefined ? '—' : input.parts.landmark.toFixed(2);
  const rules = input.parts ? `${input.parts.rulesPassed}/${input.parts.rulesTotal}` : '—';
  const neck = pair(input.measures?.neckRatio, input.baselineNeck);
  const face = pair(input.measures?.faceShoulderRatio, input.baselineFace);
  const tilt = input.measures?.shoulderTiltDeg;
  const roll = input.measures?.headRollDeg;
  const distance = input.measures?.distanceIn;
  return [
    `pose ${frame?.poseCount ?? 0}/33`,
    `nose vis ${nose === undefined ? '—' : nose.toFixed(2)}`,
    `LS ${left === undefined ? '—' : left.toFixed(2)} RS ${right === undefined ? '—' : right.toFixed(2)}`,
    `faces ${frame?.faceCount ?? 0}`,
    `video ${frame?.videoWidth ?? 0}×${frame?.videoHeight ?? 0}`,
    `mode ${input.mode}`,
    `print ${input.print === 'v3' ? 'yes(v3)' : input.print}`,
    `fit ${fit} (iou ${iou} lm ${landmark} rules ${rules})`,
    `neck ${neck}`,
    `face/sh ${face}`,
    `tilt ${tilt === null || tilt === undefined ? '—' : `${tilt.toFixed(1)}°`}`,
    `roll ${roll === null || roll === undefined ? '—' : `${roll.toFixed(1)}°`}`,
    `dist ${distance === null || distance === undefined ? '—' : `${Math.round(distance)}in`}`,
    `state ${input.phase}`,
    `seg ${input.segHz}Hz`,
  ].join(' · ');
}

function pair(live: number | null | undefined, base: number | null): string {
  const left = live === null || live === undefined ? '—' : live.toFixed(2);
  const right = base === null ? '—' : base.toFixed(2);
  return `${left}/${right}`;
}
