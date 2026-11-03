import { calibrationConfig } from '../../calibration/config';
import { toGuideSpace, type LightSample } from '../../calibration/setupCheck';
import { screenDistanceIn } from '../../lib/posture/signals';
import type { Landmarks } from '../../lib/posture/types';

export interface FrameMessage {
  title: string;
  helper: string;
  good: boolean;
}

const GOOD: FrameMessage = { title: 'Great setup!', helper: 'Hold still for a second.', good: true };

export interface FrameChip {
  label: string;
  met: boolean;
}

export interface FrameChecklist {
  chips: FrameChip[];
  title: string;
  helper: string;
  ready: boolean;
  voice: string;
}

/** Four frame checks. Ready only when every chip has held, independent of the old score gate. */
export function frameChecklist(landmarks: Landmarks | null, light: LightSample | undefined): FrameChecklist {
  const seen = visible(landmarks);
  const shoulders = seen && shouldersOn(landmarks);
  const centered = seen && isCentered(landmarks);
  const lit = seen && !tooDark(light);
  const upright = shoulders && centered && lit && !tooClose(landmarks) && !tooFar(landmarks) && facing(landmarks);
  const chips: FrameChip[] = [
    { label: 'Face centered', met: centered },
    { label: 'Both shoulders in view', met: shoulders },
    { label: 'Good light', met: lit },
    { label: 'Upright, facing the screen', met: upright },
  ];
  if (chips.every((chip) => chip.met)) {
    return { chips, title: GOOD.title, helper: GOOD.helper, ready: true, voice: "Perfect, you're framed" };
  }
  const message = frameMessage(landmarks, light, 0);
  const helper = seen && !shoulders ? 'Scoot back a little so I can see both shoulders' : message.helper;
  return { chips, title: "Let's frame you", helper, ready: false, voice: helper };
}

/** One frame-check message. Great setup never shares a line with a correction. */
export function frameMessage(landmarks: Landmarks | null, light: LightSample | undefined, score: number): FrameMessage {
  if (!visible(landmarks)) {
    return { title: 'Step into view', helper: 'Sit where the camera can see your head and shoulders.', good: false };
  }
  if (!shouldersOn(landmarks)) {
    return { title: 'Show your shoulders', helper: 'Lean back a little or tilt your screen down.', good: false };
  }
  if (tooDark(light)) {
    return { title: 'Add some light', helper: 'Face a window or turn on a lamp.', good: false };
  }
  const head = headInView(landmarks);
  if (head && (head.x < 0.38 || head.x > 0.62)) {
    return {
      title: head.x < 0.5 ? 'Move a little right' : 'Move a little left',
      helper: 'Line your head up with the guide.',
      good: false,
    };
  }
  if (tooClose(landmarks)) return { title: 'Move back a bit', helper: 'So your shoulders fit in the guide.', good: false };
  if (tooFar(landmarks)) return { title: 'Move a little closer', helper: 'So I can see your head and shoulders.', good: false };
  if (score >= calibrationConfig.setup.greatScore) return GOOD;
  return { title: 'Face the screen', helper: 'Keep your head level and look straight ahead.', good: false };
}

function visible(landmarks: Landmarks | null): landmarks is Landmarks {
  if (!landmarks || landmarks.videoWidth <= 0 || landmarks.faceCount > 1 || landmarks.faceAmbiguous) return false;
  const nose = landmarks.nose;
  const noseOk = Boolean(nose) && (nose?.visibility === undefined || nose.visibility >= 0.5);
  return noseOk || Boolean(landmarks.leftEye && landmarks.rightEye);
}

function shouldersOn(landmarks: Landmarks): boolean {
  const min = calibrationConfig.setup.shoulderVisibility;
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  return Boolean(left && right && (left.visibility ?? 1) >= min && (right.visibility ?? 1) >= min);
}

function tooDark(light: LightSample | undefined): boolean {
  if (!light) return false;
  const cfg = calibrationConfig.setup;
  return light.face < cfg.lightFullFace || light.background - light.face > cfg.backlitZero;
}

function isCentered(landmarks: Landmarks): boolean {
  const head = headInView(landmarks);
  if (!head) return false;
  return head.x >= 0.38 && head.x <= 0.62;
}

function facing(landmarks: Landmarks): boolean {
  if (landmarks.yawDeg !== undefined && Math.abs(landmarks.yawDeg) > 25) return false;
  if (landmarks.pitchDeg !== undefined && Math.abs(landmarks.pitchDeg) > 20) return false;
  return true;
}

function headInView(landmarks: Landmarks): { x: number; y: number } | null {
  const left = landmarks.leftEye;
  const right = landmarks.rightEye;
  const point = left && right ? { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 } : landmarks.nose;
  if (!point) return null;
  return toGuideSpace(point.x, point.y, landmarks.videoWidth, landmarks.videoHeight);
}

function tooClose(landmarks: Landmarks): boolean {
  const cfg = calibrationConfig.setup;
  const width = landmarks.faceBox?.w;
  const inches = screenDistanceIn(landmarks);
  return (width !== undefined && width > cfg.faceWidthFullMax) || (inches !== undefined && inches < cfg.distanceFullMinIn);
}

function tooFar(landmarks: Landmarks): boolean {
  const cfg = calibrationConfig.setup;
  const width = landmarks.faceBox?.w;
  const inches = screenDistanceIn(landmarks);
  if (tooClose(landmarks)) return false;
  return (width !== undefined && width > 0 && width < cfg.faceWidthFullMin) || (inches !== undefined && inches > cfg.distanceFullMaxIn);
}
