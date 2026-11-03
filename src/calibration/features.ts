import type { FeatureKey } from './config';
import { elbowAngleDeg } from '../lib/posture/standing';
import { dist, irisDiameterPx, mid, tiltFromHorizontalDeg } from '../lib/posture/signals';
import type { Landmarks, Point2D } from '../lib/posture/types';

export interface PrintFrame {
  landmarks: Landmarks;
  /** Degrees from the face transformation matrix, when the caller has it. */
  rollDeg?: number;
  pitchDeg?: number;
  yawDeg?: number;
  /** 0–1 mean luminance of the face box. Sampled on device and discarded. */
  luminance?: number;
  posePresence?: number;
  prevNose?: Point2D;
  /** Saved print yaw. The yaw gate is relative to this. */
  printYawDeg?: number;
}

export interface ExternalSnapshot {
  faceScale: number;
  headX: number;
  headY: number;
  pitch: number;
  yaw: number;
  shoulderWidthPx: number;
}

export function extractFeatures(frame: PrintFrame): {
  internal: Partial<Record<FeatureKey, number>>;
  external: ExternalSnapshot;
} {
  const { landmarks } = frame;
  const internal: Partial<Record<FeatureKey, number>> = {};
  const shoulders = landmarks.leftShoulder && landmarks.rightShoulder
    ? { left: landmarks.leftShoulder, right: landmarks.rightShoulder, width: dist(landmarks.leftShoulder, landmarks.rightShoulder) }
    : null;
  const shoulderMid = shoulders ? mid(shoulders.left, shoulders.right) : null;
  const faceWidth = eyeSpan(landmarks);

  if (shoulders && shoulderMid && shoulders.width > 0) {
    if (landmarks.leftEye && landmarks.rightEye) {
      const eyeMid = mid(landmarks.leftEye, landmarks.rightEye);
      internal.headDrop = (shoulderMid.y - eyeMid.y) / shoulders.width;
    }
    if (faceWidth > 0) {
      internal.leanIn = faceWidth / shoulders.width;
      internal.rounding = shoulders.width / faceWidth;
    }
    if (landmarks.leftEar && landmarks.rightEar) {
      const leftGap = shoulders.left.y - landmarks.leftEar.y;
      const rightGap = shoulders.right.y - landmarks.rightEar.y;
      internal.shrug = (leftGap + rightGap) / 2 / shoulders.width;
      internal.forwardHead = angleDeg(shoulderMid, landmarks.leftEar, landmarks.rightEar);
    }
    if (landmarks.leftHip && landmarks.rightHip) {
      const hipMid = mid(landmarks.leftHip, landmarks.rightHip);
      internal.hipLean = (hipMid.x - shoulderMid.x) / shoulders.width;
    }
  }

  const roll = frame.rollDeg ?? eyeRoll(landmarks);
  if (roll !== undefined) internal.headRoll = roll;

  const leftElbow = landmarks.leftShoulder && landmarks.leftElbow && landmarks.leftWrist
    ? elbowAngleDeg(landmarks.leftShoulder, landmarks.leftElbow, landmarks.leftWrist)
    : null;
  const rightElbow = landmarks.rightShoulder && landmarks.rightElbow && landmarks.rightWrist
    ? elbowAngleDeg(landmarks.rightShoulder, landmarks.rightElbow, landmarks.rightWrist)
    : null;
  if (leftElbow !== null) internal.elbowLeft = leftElbow;
  if (rightElbow !== null) internal.elbowRight = rightElbow;

  const head = headCenter(landmarks);
  return {
    internal,
    external: {
      faceScale: irisDiameterPx(landmarks) ?? 0,
      headX: head.x,
      headY: head.y,
      pitch: frame.pitchDeg ?? 0,
      yaw: frame.yawDeg ?? 0,
      shoulderWidthPx: shoulders?.width ?? 0,
    },
  };
}

function eyeSpan(landmarks: Landmarks): number {
  if (landmarks.leftEye && landmarks.rightEye) return dist(landmarks.leftEye, landmarks.rightEye);
  return 0;
}

function eyeRoll(landmarks: Landmarks): number | undefined {
  if (!landmarks.leftEye || !landmarks.rightEye) return undefined;
  return tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye);
}

function headCenter(landmarks: Landmarks): Point2D {
  if (landmarks.leftEye && landmarks.rightEye) {
    const eyeMid = mid(landmarks.leftEye, landmarks.rightEye);
    return { x: eyeMid.x / landmarks.videoWidth, y: eyeMid.y / landmarks.videoHeight };
  }
  if (landmarks.nose) return { x: landmarks.nose.x / landmarks.videoWidth, y: landmarks.nose.y / landmarks.videoHeight };
  return { x: 0, y: 0 };
}

function angleDeg(vertex: Point2D, a: Point2D, b: Point2D): number {
  const left = { x: a.x - vertex.x, y: a.y - vertex.y };
  const right = { x: b.x - vertex.x, y: b.y - vertex.y };
  const scale = Math.hypot(left.x, left.y) * Math.hypot(right.x, right.y);
  if (scale <= 0) return Number.NaN;
  const cos = Math.min(1, Math.max(-1, (left.x * right.x + left.y * right.y) / scale));
  return (Math.acos(cos) * 180) / Math.PI;
}
