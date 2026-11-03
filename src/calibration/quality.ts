import { calibrationConfig } from './config';
import type { PrintFrame } from './features';
import type { Landmark } from '../lib/posture/types';

export type QualityIssue = 'presence' | 'shoulders' | 'faces' | 'yaw' | 'roll' | 'motion' | 'light';

export function frameQuality(frame: PrintFrame): QualityIssue | null {
  const { landmarks } = frame;
  const presence = frame.posePresence ?? 1;
  if (presence < calibrationConfig.presenceMin) return 'presence';
  if (!shouldersOk(landmarks.leftShoulder, landmarks.rightShoulder)) return 'shoulders';
  if (landmarks.faceCount !== 1 || landmarks.faceAmbiguous) return 'faces';
  if (frame.yawDeg !== undefined) {
    const base = frame.printYawDeg ?? 0;
    if (Math.abs(frame.yawDeg - base) > calibrationConfig.yawMaxDeg) return 'yaw';
  }
  if (frame.rollDeg !== undefined && Math.abs(frame.rollDeg) > calibrationConfig.rollMaxDeg) return 'roll';
  if (movedTooFar(frame)) return 'motion';
  if (frame.luminance !== undefined) {
    const { luminanceMin, luminanceMax } = calibrationConfig;
    if (frame.luminance < luminanceMin || frame.luminance > luminanceMax) return 'light';
  }
  return null;
}

export function qualityFix(issue: QualityIssue): string {
  if (issue === 'light') return 'Your face is in shadow. Face a window or lamp.';
  if (issue === 'shoulders') return 'Both shoulders need to be in frame.';
  if (issue === 'faces') return 'I need to see just you. Step so one person fills the frame.';
  if (issue === 'yaw' || issue === 'roll') return 'Turn to face the camera a little more squarely.';
  if (issue === 'motion') return 'Hold still for a moment.';
  return 'Step into the frame so I can see you.';
}

function shouldersOk(left: Landmark | undefined, right: Landmark | undefined): boolean {
  if (!left || !right) return false;
  const min = calibrationConfig.shoulderVisibilityMin;
  if (left.visibility !== undefined && left.visibility < min) return false;
  if (right.visibility !== undefined && right.visibility < min) return false;
  return true;
}

function movedTooFar(frame: PrintFrame): boolean {
  const nose = frame.landmarks.nose;
  if (!nose || !frame.prevNose || frame.landmarks.videoWidth <= 0) return false;
  const jump = Math.hypot(nose.x - frame.prevNose.x, nose.y - frame.prevNose.y);
  return jump / frame.landmarks.videoWidth >= calibrationConfig.noseMotionRatio;
}
