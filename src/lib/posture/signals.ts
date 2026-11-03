import { postureConfig } from './config';
import type { Baseline, Landmarks, Point2D } from './types';

export function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function mid(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Tilt from horizontal in degrees, near 0 when the two points are level. */
export function tiltFromHorizontalDeg(left: Point2D, right: Point2D): number {
  let deg = (Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;
  return deg;
}

export function focalPxFromWidth(
  videoWidth: number,
  fovDeg: number = postureConfig.assumedFovDeg,
): number {
  const halfFovRad = ((fovDeg / 2) * Math.PI) / 180;
  return videoWidth / 2 / Math.tan(halfFovRad);
}

export function irisDiameterPx(landmarks: Landmarks): number | undefined {
  const diameters = [landmarks.leftIrisDiameterPx, landmarks.rightIrisDiameterPx].filter(
    (value): value is number => typeof value === 'number' && value > 0,
  );
  if (diameters.length === 0) return undefined;
  return diameters.reduce((sum, value) => sum + value, 0) / diameters.length;
}

export function distanceInches(irisPx: number, focalPx: number, irisMm = postureConfig.irisMm): number {
  if (irisPx <= 0 || focalPx <= 0) return Number.NaN;
  const distanceMm = (focalPx * irisMm) / irisPx;
  return distanceMm / 25.4;
}

export function interPupilPx(landmarks: Landmarks): number | undefined {
  if (landmarks.leftIrisCenter && landmarks.rightIrisCenter) {
    return dist(landmarks.leftIrisCenter, landmarks.rightIrisCenter);
  }
  if (landmarks.leftEye && landmarks.rightEye) {
    return dist(landmarks.leftEye, landmarks.rightEye);
  }
  return undefined;
}

export function screenDistanceIn(landmarks: Landmarks, focalPx?: number): number | undefined {
  const iris = irisDiameterPx(landmarks);
  if (!iris) return undefined;
  const focal = focalPx ?? focalPxFromWidth(landmarks.videoWidth);
  const inches = distanceInches(iris, focal);
  return Number.isFinite(inches) ? inches : undefined;
}

export interface FrameSignals {
  ipdPx?: number;
  headDropNorm?: number;
  shrugNorm?: number;
  roundNorm?: number;
  shoulderAngleDeg?: number;
  eyeAngleDeg?: number;
  shoulderWidthPx?: number;
  screenDistanceIn?: number;
  focalPx: number;
}

export function frameSignals(landmarks: Landmarks, focalPx?: number): FrameSignals {
  const focal = focalPx ?? focalPxFromWidth(landmarks.videoWidth);
  const ipd = interPupilPx(landmarks);
  const signals: FrameSignals = { focalPx: focal, ipdPx: ipd, screenDistanceIn: screenDistanceIn(landmarks, focal) };

  if (landmarks.leftEye && landmarks.rightEye) {
    signals.eyeAngleDeg = tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye);
  }
  if (landmarks.leftShoulder && landmarks.rightShoulder) {
    signals.shoulderAngleDeg = tiltFromHorizontalDeg(landmarks.leftShoulder, landmarks.rightShoulder);
    signals.shoulderWidthPx = dist(landmarks.leftShoulder, landmarks.rightShoulder);
    if (ipd && ipd > 0) {
      signals.roundNorm = signals.shoulderWidthPx / ipd;
    }
  }
  if (landmarks.nose && landmarks.leftShoulder && landmarks.rightShoulder && ipd && ipd > 0) {
    const shoulderMid = mid(landmarks.leftShoulder, landmarks.rightShoulder);
    signals.headDropNorm = (shoulderMid.y - landmarks.nose.y) / ipd;
  }
  if (
    landmarks.leftEar &&
    landmarks.rightEar &&
    landmarks.leftShoulder &&
    landmarks.rightShoulder &&
    ipd &&
    ipd > 0
  ) {
    const leftGap = landmarks.leftShoulder.y - landmarks.leftEar.y;
    const rightGap = landmarks.rightShoulder.y - landmarks.rightEar.y;
    signals.shrugNorm = (leftGap + rightGap) / 2 / ipd;
  }
  return signals;
}

export function refineFocalLength(baseline: Baseline, reportedInches: number): Baseline {
  if (!(baseline.screenDistanceIn > 0) || !(reportedInches > 0)) return baseline;
  const scale = reportedInches / baseline.screenDistanceIn;
  return {
    ...baseline,
    focalPx: baseline.focalPx * scale,
    screenDistanceIn: reportedInches,
  };
}
