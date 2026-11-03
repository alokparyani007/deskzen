import { postureConfig } from './config';
import { aspectFactor, focalFor, lengthRatio, vgaPixels } from './resolution';
import { frameSignals } from './signals';
import type { Baseline, FrameQuality, Landmarks, Point2D, SignalReadings } from './types';

export interface MotionMemory {
  prevNose?: Point2D;
  movingUntilMs: number;
}

export function readSignals(
  landmarks: Landmarks,
  baseline: Baseline,
  motion: MotionMemory,
): { readings: SignalReadings; motion: MotionMemory } {
  const nextMotion: MotionMemory = {
    prevNose: landmarks.nose ?? motion.prevNose,
    movingUntilMs: motion.movingUntilMs,
  };
  const quality = classify(landmarks, baseline, motion, nextMotion);
  if (quality !== 'good') {
    return { readings: { quality }, motion: nextMotion };
  }

  const now = frameSignals(landmarks, focalFor(landmarks, baseline));
  const readings: SignalReadings = { quality, screenDistanceIn: now.screenDistanceIn };
  const frameScale = aspectFactor(landmarks.videoWidth, landmarks.videoHeight);
  const savedScale = aspectFactor(baseline.videoWidth, baseline.videoHeight);

  if (now.ipdPx && baseline.ipdPx > 0) {
    readings.leanDev = Math.max(0, lengthRatio(now.ipdPx, landmarks.videoWidth, baseline.ipdPx, baseline.videoWidth) - 1);
  }
  if (now.headDropNorm !== undefined && baseline.headDropNorm > 0) {
    readings.headDropDev = Math.max(0, 1 - (now.headDropNorm * frameScale) / (baseline.headDropNorm * savedScale));
  }
  const earsVisible = Boolean(landmarks.leftEar && landmarks.rightEar);
  if (earsVisible && now.shrugNorm !== undefined && now.roundNorm !== undefined && baseline.shrugNorm > 0 && baseline.roundNorm > 0) {
    const shrugDev = Math.max(0, 1 - (now.shrugNorm * frameScale) / (baseline.shrugNorm * savedScale));
    const roundDev = Math.max(0, 1 - now.roundNorm / baseline.roundNorm);
    readings.shoulderDev = Math.max(shrugDev, roundDev);
  }
  const tiltParts: number[] = [];
  if (now.shoulderAngleDeg !== undefined) tiltParts.push(Math.abs(now.shoulderAngleDeg - baseline.shoulderAngleDeg));
  if (now.eyeAngleDeg !== undefined) tiltParts.push(Math.abs(now.eyeAngleDeg - baseline.eyeAngleDeg));
  if (tiltParts.length > 0) readings.tiltDevDeg = Math.max(...tiltParts);
  if (now.screenDistanceIn !== undefined) {
    readings.distDev = Math.max(0, (postureConfig.minComfortIn - now.screenDistanceIn) / postureConfig.minComfortIn);
  }
  return { readings, motion: nextMotion };
}

function classify(
  landmarks: Landmarks,
  baseline: Baseline,
  motion: MotionMemory,
  nextMotion: MotionMemory,
): FrameQuality {
  if (landmarks.faceAmbiguous) return 'multiple-faces';
  if (!landmarks.nose || landmarks.faceCount === 0) return 'absent';
  const watched = [landmarks.nose, landmarks.leftEye, landmarks.rightEye, landmarks.leftShoulder, landmarks.rightShoulder];
  if (watched.some((point) => !point || (point.visibility !== undefined && point.visibility < postureConfig.minVisibility))) {
    return 'low-visibility';
  }
  const ipd = frameSignals(landmarks, focalFor(landmarks, baseline)).ipdPx;
  if (ipd && baseline.ipdPx > 0) {
    const ratio = lengthRatio(ipd, landmarks.videoWidth, baseline.ipdPx, baseline.videoWidth);
    if (ratio < 0.5 || ratio > 2) return 'low-visibility';
    if (motion.prevNose && landmarks.nose) {
      const jump = vgaPixels(landmarks.nose.x - motion.prevNose.x, landmarks.nose.y - motion.prevNose.y, landmarks.videoWidth, landmarks.videoHeight);
      const ipdVga = vgaPixels(ipd, 0, landmarks.videoWidth, landmarks.videoHeight);
      if (jump > 0.5 * ipdVga) nextMotion.movingUntilMs = landmarks.timestampMs + 1000;
    }
  }
  if (landmarks.timestampMs < nextMotion.movingUntilMs) return 'moving';
  return 'good';
}

export function inchesFromBest(baseline: Baseline, readings: SignalReadings): number | undefined {
  if (readings.screenDistanceIn === undefined) return undefined;
  return Math.max(0, Math.round(baseline.screenDistanceIn - readings.screenDistanceIn));
}
