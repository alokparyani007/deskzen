import { confidenceScore } from '../../calibration/confidence';
import { calibrationConfig } from '../../calibration/config';
import { extractFeatures } from '../../calibration/features';
import { median } from '../../lib/posture/baseline';
import { postureConfig } from '../../lib/posture/config';
import { irisDiameterPx, screenDistanceIn } from '../../lib/posture/signals';
import type { Landmarks } from '../../lib/posture/types';

export interface GlowStat {
  label: string;
  inches: number;
}

export function confidenceFromLock(input: {
  good: number;
  seen: number;
  stillness: number;
  meanVisibility: number;
  lighting: number;
  framing: number;
}): number {
  return confidenceScore({
    goodFrameRatio: input.seen === 0 ? 0 : input.good / input.seen,
    stillness: input.stillness,
    meanVisibility: input.meanVisibility,
    lighting: input.lighting,
    framing: input.framing,
  });
}

export function lightingPart(face: number | undefined): number {
  if (face === undefined || !Number.isFinite(face)) return 0;
  const { luminanceMin, luminanceMax } = calibrationConfig;
  if (face >= luminanceMin && face <= luminanceMax) return 1;
  if (face < luminanceMin) return face / luminanceMin;
  return Math.max(0, (1 - face) / Math.max(0.001, 1 - luminanceMax));
}

export function glowDifferences(zen: Landmarks[], slouch: Landmarks[]): GlowStat[] {
  if (zen.length === 0 || slouch.length === 0) return [];
  const iris = median(zen.map((frame) => irisDiameterPx(frame) ?? Number.NaN).filter((value) => value > 0));
  if (!Number.isFinite(iris) || iris <= 0) return [];
  const perPx = postureConfig.irisMm / 25.4 / iris;
  const noseY = (frames: Landmarks[]) => median(frames.map((frame) => frame.nose?.y ?? Number.NaN).filter((value) => Number.isFinite(value)));
  const width = (frames: Landmarks[]) =>
    median(frames.map((frame) => (frame.leftShoulder && frame.rightShoulder ? Math.abs(frame.rightShoulder.x - frame.leftShoulder.x) : Number.NaN)).filter((value) => Number.isFinite(value)));
  const distance = (frames: Landmarks[]) => median(frames.map((frame) => screenDistanceIn(frame) ?? Number.NaN).filter((value) => Number.isFinite(value)));
  const lean = (frames: Landmarks[]) => median(frames.map((frame) => extractFeatures({ landmarks: frame }).internal.leanIn ?? Number.NaN).filter((value) => Number.isFinite(value)));
  const headIn = (noseY(slouch) - noseY(zen)) * perPx;
  const shoulderIn = (width(zen) - width(slouch)) * perPx;
  const zenDistance = distance(zen);
  const slouchDistance = distance(slouch);
  const farther = Number.isFinite(zenDistance) && Number.isFinite(slouchDistance) ? zenDistance - slouchDistance : (lean(slouch) - lean(zen)) * (width(zen) || 0) * perPx;
  const stats: GlowStat[] = [
    { label: 'Head about', inches: roundTenths(headIn) },
    { label: 'About', inches: roundTenths(farther) },
    { label: 'Shoulders about', inches: roundTenths(shoulderIn) },
  ];
  return stats
    .filter((stat) => stat.inches >= 0.3)
    .sort((left, right) => right.inches - left.inches)
    .slice(0, 2);
}

export function showGlowComparison(gaveUp: boolean, slouchCount: number): boolean {
  return !gaveUp && slouchCount > 0;
}

export function frameStillness(frames: Landmarks[]): number {
  if (frames.length < 2) return 1;
  let sum = 0;
  let count = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const previous = frames[index - 1]?.nose;
    const next = frames[index]?.nose;
    const width = frames[index]?.videoWidth || 1;
    if (!previous || !next) continue;
    sum += Math.hypot(previous.x - next.x, previous.y - next.y) / width;
    count += 1;
  }
  if (count === 0) return 1;
  return Math.max(0, Math.min(1, 1 - sum / count / calibrationConfig.noseMotionRatio));
}

export function frameVisibility(frames: Landmarks[]): number {
  const values: number[] = [];
  for (const frame of frames) {
    for (const point of [frame.nose, frame.leftEye, frame.rightEye, frame.leftShoulder, frame.rightShoulder]) {
      values.push(point ? (point.visibility ?? 1) : 0);
    }
  }
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundTenths(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}
