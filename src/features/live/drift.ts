import { slouchAmount } from '../../calibration/catchMe';
import { calibrationConfig } from '../../calibration/config';
import { extractFeatures } from '../../calibration/features';
import { driftKind, type DriftKind, type LockedPose } from '../../calibration/lockedPose';
import type { PosturePrint } from '../../calibration/print';
import type { Landmarks } from '../../lib/posture/types';

export function printDrift(frame: Landmarks, print: PosturePrint, pose: LockedPose | undefined): { amount: number; kind: DriftKind | null } {
  const amount = slouchAmount(frame, print.anchor);
  const internal = extractFeatures({ landmarks: frame }).internal;
  const norm = (key: 'headDrop' | 'shrug' | 'rounding' | 'leanIn', value: number | undefined) => {
    const base = print.anchor.values[key];
    if (value === undefined || base === undefined) return 0;
    const scale = Math.max(print.anchor.spread[key] ?? 0, calibrationConfig.floor[key]);
    return scale <= 0 ? 0 : Math.abs(value - base) / scale;
  };
  const liveLean = frame.nose && frame.leftShoulder && frame.rightShoulder && frame.videoWidth > 0
    ? Math.abs(frame.nose.x - (frame.leftShoulder.x + frame.rightShoulder.x) / 2) / frame.videoWidth
    : 0;
  const savedLean = pose ? Math.abs(pose.nose.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2) : liveLean;
  return {
    amount,
    kind: driftKind({
      head: norm('headDrop', internal.headDrop),
      shoulders: Math.max(norm('shrug', internal.shrug), norm('rounding', internal.rounding)),
      lean: Math.abs(liveLean - savedLean) / 0.04,
    }),
  };
}
