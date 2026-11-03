import { postureConfig } from './config';
import type { Landmark, Landmarks, Point2D } from './types';

export function smoothLandmarks(previous: Landmarks | null, next: Landmarks, tauSeconds = postureConfig.calibration.smoothTauSeconds): Landmarks {
  if (!previous || previous.videoWidth !== next.videoWidth || previous.videoHeight !== next.videoHeight) return next;
  const dt = Math.max(0, (next.timestampMs - previous.timestampMs) / 1000);
  const alpha = dt <= 0 ? 1 : 1 - Math.exp(-dt / tauSeconds);
  return {
    ...next,
    nose: mixLandmark(previous.nose, next.nose, alpha),
    leftEye: mixLandmark(previous.leftEye, next.leftEye, alpha),
    rightEye: mixLandmark(previous.rightEye, next.rightEye, alpha),
    leftEar: mixLandmark(previous.leftEar, next.leftEar, alpha),
    rightEar: mixLandmark(previous.rightEar, next.rightEar, alpha),
    leftShoulder: mixLandmark(previous.leftShoulder, next.leftShoulder, alpha),
    rightShoulder: mixLandmark(previous.rightShoulder, next.rightShoulder, alpha),
    leftElbow: mixLandmark(previous.leftElbow, next.leftElbow, alpha),
    rightElbow: mixLandmark(previous.rightElbow, next.rightElbow, alpha),
    leftWrist: mixLandmark(previous.leftWrist, next.leftWrist, alpha),
    rightWrist: mixLandmark(previous.rightWrist, next.rightWrist, alpha),
    leftHip: mixLandmark(previous.leftHip, next.leftHip, alpha),
    rightHip: mixLandmark(previous.rightHip, next.rightHip, alpha),
    leftIrisCenter: mixPoint(previous.leftIrisCenter, next.leftIrisCenter, alpha),
    rightIrisCenter: mixPoint(previous.rightIrisCenter, next.rightIrisCenter, alpha),
    leftIrisDiameterPx: mixNumber(previous.leftIrisDiameterPx, next.leftIrisDiameterPx, alpha),
    rightIrisDiameterPx: mixNumber(previous.rightIrisDiameterPx, next.rightIrisDiameterPx, alpha),
  };
}

function mixLandmark(previous: Landmark | undefined, next: Landmark | undefined, alpha: number): Landmark | undefined {
  const point = mixPoint(previous, next, alpha);
  if (!point || !next) return undefined;
  return { ...point, visibility: next.visibility, z: next.z };
}

function mixPoint(previous: Point2D | undefined, next: Point2D | undefined, alpha: number): Point2D | undefined {
  if (!next) return undefined;
  if (!previous) return next;
  return {
    x: previous.x + alpha * (next.x - previous.x),
    y: previous.y + alpha * (next.y - previous.y),
  };
}

function mixNumber(previous: number | undefined, next: number | undefined, alpha: number): number | undefined {
  if (next === undefined) return undefined;
  if (previous === undefined) return next;
  return previous + alpha * (next - previous);
}
