import type { LockedPose } from '../../calibration/lockedPose';
import { postureConfig } from '../../lib/posture/config';
import type { Landmark, Landmarks } from '../../lib/posture/types';
import type { TipCopy } from './coach';

export type FrameStatus = 'ok' | 'no-person' | 'no-shoulders' | 'multiple' | 'dark';

/** Pose presence. Not the shoulder-coach cutoff. */
export const PRESENCE_VISIBILITY = 0.5;

export interface FrameRead {
  status: FrameStatus;
  /** One shoulder was mirrored from the other so coaching can continue. */
  estimated: boolean;
  /** Landmarks safe to score. Null when the person is not coachable yet. */
  coaching: Landmarks | null;
  /** True when pose landmarks show a person, even if the face model missed them. */
  person: boolean;
}

export interface FrameMemory {
  shown: FrameStatus;
  pending: FrameStatus | null;
  pendingSince: number;
}

export function emptyFrame(): FrameMemory {
  return { shown: 'ok', pending: null, pendingSince: 0 };
}

/** Saved shoulder span divided by saved face width. Used to place a hidden shoulder. */
export function shoulderWidthRatio(pose: LockedPose | null | undefined): number | null {
  if (!pose || pose.faceWidth <= 0) return null;
  const width = Math.hypot(pose.rightShoulder.x - pose.leftShoulder.x, pose.rightShoulder.y - pose.leftShoulder.y);
  if (width <= 0) return null;
  return width / pose.faceWidth;
}

export function frameStatus(frame: Landmarks | null, options?: { dark?: boolean; shoulderRatio?: number | null; videoReady?: boolean }): FrameRead {
  if (options?.videoReady === false) return { status: 'ok', estimated: false, coaching: null, person: false };
  if (!frame || frame.videoWidth <= 0 || frame.videoHeight <= 0) return { status: 'no-person', estimated: false, coaching: null, person: false };
  if (frame.faceAmbiguous || frame.faceCount > 1) return { status: 'multiple', estimated: false, coaching: null, person: true };
  if (!personPresent(frame)) return { status: 'no-person', estimated: false, coaching: null, person: false };
  const left = usable(frame.leftShoulder);
  const right = usable(frame.rightShoulder);
  if (left && right) {
    if (options?.dark) return { status: 'dark', estimated: false, coaching: null, person: true };
    return { status: 'ok', estimated: false, coaching: frame, person: true };
  }
  if (left || right) {
    const side = left ? 'rightShoulder' : 'leftShoulder';
    const source = left ? frame.leftShoulder! : frame.rightShoulder!;
    const guessed = mirrorShoulder(frame, side, source, options?.shoulderRatio ?? null);
    if (guessed) {
      return { status: 'ok', estimated: true, coaching: { ...frame, [side]: guessed }, person: true };
    }
  }
  return { status: 'no-shoulders', estimated: false, coaching: null, person: true };
}

export function framingCopy(status: FrameStatus, _frame: Landmarks | null): TipCopy | null {
  if (status === 'ok') return null;
  if (status === 'multiple') return { title: 'Just you in the frame, please', helper: 'One person at a time.' };
  if (status === 'dark') return { title: 'Add some light', helper: 'Face a window or turn on a lamp.' };
  if (status === 'no-shoulders') return { title: 'Show both shoulders', helper: 'Lean back a little or tilt your screen down.' };
  return { title: 'Step into view', helper: 'Sit where the camera can see your head and shoulders.' };
}

/** Screen direction when the face sits far to one side of the mirrored preview. */
export function sideNudge(frame: Landmarks | null): string | null {
  if (!frame?.nose || frame.videoWidth <= 0) return null;
  const raw = frame.nose.x / frame.videoWidth;
  if (raw < 0.3) return 'Move a little left';
  if (raw > 0.7) return 'Move a little right';
  return null;
}

/** Show a framing line only after it has held still. Recovery is immediate. */
export function stepFrame(memory: FrameMemory, now: number, status: FrameStatus, holdMs = 1_500): { memory: FrameMemory; shown: FrameStatus } {
  if (status === 'ok') {
    if (memory.shown === 'ok' && memory.pending === null) return { memory, shown: 'ok' };
    return { memory: emptyFrame(), shown: 'ok' };
  }
  if (status === memory.shown) {
    if (memory.pending === null) return { memory, shown: memory.shown };
    return { memory: { ...memory, pending: null, pendingSince: 0 }, shown: memory.shown };
  }
  if (memory.pending !== status) return { memory: { ...memory, pending: status, pendingSince: now }, shown: memory.shown };
  if (now - memory.pendingSince >= holdMs) return { memory: { shown: status, pending: null, pendingSince: 0 }, shown: status };
  return { memory, shown: memory.shown };
}

function personPresent(frame: Landmarks): boolean {
  return posePoint(frame.nose) || posePoint(frame.leftEye) || posePoint(frame.rightEye);
}

function posePoint(point: Landmark | undefined): boolean {
  if (!point) return false;
  return point.visibility === undefined || point.visibility >= PRESENCE_VISIBILITY;
}

function usable(point: Landmark | undefined): boolean {
  return Boolean(point) && (point!.visibility === undefined || point!.visibility >= postureConfig.coachShoulderVisibility);
}

function mirrorShoulder(frame: Landmarks, _side: 'leftShoulder' | 'rightShoulder', source: Landmark, ratio: number | null): Landmark | null {
  const center = faceCenterX(frame);
  if (center === null) return null;
  const mirrored = center - (source.x - center);
  let x = mirrored;
  const faceWidth = liveFaceWidth(frame);
  if (ratio && ratio > 0 && faceWidth > 0) {
    const half = (ratio * faceWidth) / 2;
    const sign = mirrored >= center ? 1 : -1;
    x = center + sign * half;
  }
  return { x, y: source.y, visibility: postureConfig.coachShoulderVisibility };
}

function faceCenterX(frame: Landmarks): number | null {
  if (frame.leftEye && frame.rightEye) return (frame.leftEye.x + frame.rightEye.x) / 2;
  return frame.nose?.x ?? null;
}

function liveFaceWidth(frame: Landmarks): number {
  if (frame.faceBox && frame.faceBox.w > 0) return frame.faceBox.w * frame.videoWidth;
  if (frame.leftEye && frame.rightEye) return Math.abs(frame.rightEye.x - frame.leftEye.x) * 2.2;
  return 0;
}
