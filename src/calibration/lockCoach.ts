import { calibrationConfig } from './config';
import { extractFeatures } from './features';
import { dist, mid, tiltFromHorizontalDeg } from '../lib/posture/signals';
import type { Landmarks } from '../lib/posture/types';

export interface LockAfter {
  shoulderY: number;
  faceRatio: number;
  shoulderGap: number;
  forwardHead?: number;
}

export type LockCheckId = 'tall' | 'shoulders' | 'ears' | 'level';

export interface LockPose {
  shoulderY: number;
  noseOffset: number | null;
  faceRatio: number | null;
  shoulderGap: number | null;
  tiltDeg: number | null;
  forwardHead: number | null;
  pitchDeg: number | null;
  rollDeg: number | null;
}

export interface LockCheck {
  id: LockCheckId;
  label: string;
  pass: boolean;
  tip: string;
}

export interface LockView {
  checks: LockCheck[];
  passed: number;
  tip: string | null;
  ready: boolean;
}

const LABELS: Record<LockCheckId, string> = {
  tall: 'Sitting tall',
  shoulders: 'Shoulders relaxed and level',
  ears: 'Ears over shoulders',
  level: 'Screen at eye level',
};

export function measureLockPose(landmarks: Landmarks): LockPose | null {
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  if (!left || !right) return null;
  const width = dist(left, right);
  if (width < 8) return null;
  const shoulder = mid(left, right);
  const features = extractFeatures({ landmarks }).internal;
  const head = landmarks.leftEar && landmarks.rightEar
    ? mid(landmarks.leftEar, landmarks.rightEar)
    : landmarks.leftEye && landmarks.rightEye
      ? mid(landmarks.leftEye, landmarks.rightEye)
      : null;
  const roll = landmarks.leftEye && landmarks.rightEye ? tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye) : null;
  return {
    shoulderY: shoulder.y / width,
    noseOffset: landmarks.nose && landmarks.videoWidth > 0 ? Math.abs(landmarks.nose.x - shoulder.x) / landmarks.videoWidth : null,
    faceRatio: features.leanIn ?? null,
    shoulderGap: head ? (shoulder.y - head.y) / width : null,
    tiltDeg: Math.abs(tiltFromHorizontalDeg(left, right)),
    forwardHead: features.forwardHead ?? null,
    pitchDeg: landmarks.pitchDeg ?? null,
    rollDeg: roll,
  };
}

export function lockView(pose: LockPose | null, after: LockAfter | null, held: Partial<Record<LockCheckId, boolean>> = {}): LockView {
  const checks = (['tall', 'shoulders', 'ears', 'level'] as const).map((id) => {
    const judged = judge(id, pose, after, held[id] === true);
    return { id, label: LABELS[id], pass: judged.pass, tip: judged.tip };
  });
  const first = checks.find((check) => !check.pass);
  return { checks, passed: checks.filter((check) => check.pass).length, tip: first ? first.tip : null, ready: checks.every((check) => check.pass) };
}

/** The 5 s ring pauses when posture drops. It never rewinds. */
export function advanceLockFill(progress: number, dtMs: number, holding: boolean, holdMs: number = calibrationConfig.lockCoach.holdMs): number {
  if (!holding || dtMs <= 0 || holdMs <= 0) return progress;
  return Math.min(1, progress + dtMs / holdMs);
}

/** 100 only when every lock check passes. Three of four is 75, under the 90 lock. */
export function lockMatchPercent(passed: number, total = 4): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((passed / total) * 100)));
}

/**
 * A person in frame never reads 0%. Checks raise the number once a baseline exists.
 * Null means the landmarks are missing, so the screen should say it can't see you.
 */
export function movingMatch(pose: LockPose | null, passed: number, hasBaseline: boolean): number | null {
  if (!pose) return null;
  const fromChecks = hasBaseline ? lockMatchPercent(passed) : 0;
  const tilt = pose.tiltDeg === null ? 12 : Math.max(0, 24 - pose.tiltDeg);
  const pitch = pose.pitchDeg === null ? 12 : Math.max(0, 24 - Math.abs(pose.pitchDeg));
  return Math.max(Math.round(8 + tilt + pitch), fromChecks);
}

export const LOCK_HOLD_MS = 3_000;

export function lockMaySave(goodFrames: number): boolean {
  return goodFrames >= calibrationConfig.minGoodFrames;
}

function judge(id: LockCheckId, pose: LockPose | null, after: LockAfter | null, held: boolean): { pass: boolean; tip: string } {
  if (!pose || !after) return { pass: false, tip: tipFor(id) };
  const factor = held ? calibrationConfig.lockCoach.holdFactor : 1;
  if (id === 'tall') return tall(pose, after, factor);
  if (id === 'shoulders') return shoulders(pose, after, factor);
  if (id === 'ears') return ears(pose, after, factor);
  return level(pose, factor);
}

function tall(pose: LockPose, after: LockAfter, factor: number): { pass: boolean; tip: string } {
  const cfg = calibrationConfig.lockCoach;
  if (pose.noseOffset === null || pose.faceRatio === null) return { pass: false, tip: tipFor('tall') };
  const dropped = pose.shoulderY - after.shoulderY > cfg.tallDrop * factor;
  const leaning = pose.noseOffset > cfg.noseOffset * factor;
  const ratioOff = Math.abs(pose.faceRatio - after.faceRatio) / Math.max(after.faceRatio, 0.01) > cfg.faceRatioBand * factor;
  if (!dropped && !leaning && !ratioOff) return { pass: true, tip: '' };
  if (leaning) return { pass: false, tip: "Center yourself, you're leaning a bit" };
  if (ratioOff && pose.faceRatio < after.faceRatio) return { pass: false, tip: 'Ease away from the backrest a little' };
  return { pass: false, tip: 'Sit up tall, like a string is lifting your head' };
}

function shoulders(pose: LockPose, after: LockAfter, factor: number): { pass: boolean; tip: string } {
  const cfg = calibrationConfig.lockCoach;
  if (pose.shoulderGap === null || pose.tiltDeg === null || after.shoulderGap <= 0) return { pass: false, tip: tipFor('shoulders') };
  const shrugged = pose.shoulderGap < after.shoulderGap * cfg.gapKeep / factor;
  const tilted = pose.tiltDeg > cfg.shoulderTiltDeg * factor;
  if (!shrugged && !tilted) return { pass: true, tip: '' };
  return { pass: false, tip: tilted && !shrugged ? 'Level your shoulders' : 'Let your shoulders drop and relax' };
}

function ears(pose: LockPose, after: LockAfter, factor: number): { pass: boolean; tip: string } {
  const cfg = calibrationConfig.lockCoach;
  if (pose.faceRatio === null) return { pass: false, tip: tipFor('ears') };
  const bigger = pose.faceRatio > after.faceRatio * (1 + cfg.faceBigger * factor);
  const angle = pose.forwardHead !== null && after.forwardHead !== undefined && Math.abs(pose.forwardHead - after.forwardHead) > cfg.forwardHeadDeg * factor;
  const missingAngle = pose.forwardHead === null && after.forwardHead !== undefined;
  if (!bigger && !angle && !missingAngle) return { pass: true, tip: '' };
  return { pass: false, tip: 'Glide your chin back a little' };
}

function level(pose: LockPose, factor: number): { pass: boolean; tip: string } {
  const cfg = calibrationConfig.lockCoach;
  if (pose.pitchDeg === null && pose.rollDeg === null) return { pass: false, tip: tipFor('level') };
  const pitch = pose.pitchDeg !== null && Math.abs(pose.pitchDeg) > cfg.pitchDeg * factor;
  const roll = pose.rollDeg !== null && Math.abs(pose.rollDeg) > cfg.rollDeg * factor;
  if (!pitch && !roll) return { pass: true, tip: '' };
  return { pass: false, tip: pitch ? 'Look straight ahead, not down' : 'Raise your screen a bit if you can' };
}

function tipFor(id: LockCheckId): string {
  if (id === 'tall') return 'Sit up tall, like a string is lifting your head';
  if (id === 'shoulders') return 'Let your shoulders drop and relax';
  if (id === 'ears') return 'Glide your chin back a little';
  return 'Look straight ahead, not down';
}
