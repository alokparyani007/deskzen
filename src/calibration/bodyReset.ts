import { calibrationConfig } from './config';
import { postureConfig } from '../lib/posture/config';
import { dist, irisDiameterPx, tiltFromHorizontalDeg } from '../lib/posture/signals';
import type { Landmarks, Point2D } from '../lib/posture/types';

/** One pose sample. Distances stay in pixels until they are divided by shoulder width. */
export interface MoveSample {
  tMs: number;
  shoulderMidY: number;
  shoulderWidth: number;
  faceWidth: number;
  noseY: number;
  /** Head roll in degrees. Negative is the person's left. */
  rollDeg?: number;
}

interface NormSample {
  tMs: number;
  shoulderY: number;
  faceRatio: number;
  noseY: number;
}

export interface RestSample {
  tMs: number;
  shoulderGap: number;
  tiltDeg: number;
  faceRatio: number;
  shoulderY: number;
  noseY: number;
  shoulderWidthPx: number;
  irisPx: number | null;
}

export interface RestSnapshot {
  shoulderGap: number;
  tiltDeg: number;
  faceRatio: number;
  jitter: number;
  shoulderWidthPx: number;
  irisPx: number | null;
  /** Shoulder midpoint y, divided by shoulder width. Larger means lower in the frame. */
  shoulderY?: number;
}

export type LoosenessReason = 'shoulders' | 'level' | 'head' | 'settled';

export interface Looseness {
  score: number;
  dropPoints: number;
  level: boolean;
  stacked: boolean;
  settled: boolean;
  reason: LoosenessReason | null;
  message: string | null;
  retry: 'shoulders' | 'neck' | 'chin' | 'breath' | null;
}

export function measureMove(landmarks: Landmarks, tMs: number): MoveSample | null {
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  const nose = landmarks.nose;
  if (!left || !right || !nose) return null;
  const shoulderWidth = dist(left, right);
  if (shoulderWidth < 8) return null;
  const faceWidth = landmarks.leftEye && landmarks.rightEye ? dist(landmarks.leftEye, landmarks.rightEye) : 0;
  const rollDeg = landmarks.leftEye && landmarks.rightEye ? tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye) : 0;
  return { tMs, shoulderMidY: (left.y + right.y) / 2, shoulderWidth, faceWidth, noseY: nose.y, rollDeg };
}

/** Completed rolls: shoulders rise, then drop to or below where they started. */
export function shoulderRollCount(raw: readonly MoveSample[]): number {
  const smoothed = normalize(raw);
  if (smoothed.length < 3) return 0;
  const start = smoothed[0]!.shoulderY;
  const rise = calibrationConfig.bodyReset.rollRiseRatio;
  let count = 0;
  let raised = false;
  for (const sample of smoothed) {
    if (!raised && start - sample.shoulderY >= rise) raised = true;
    else if (raised && sample.shoulderY >= start) {
      count += 1;
      raised = false;
    }
  }
  return count;
}

export function shoulderRollDetected(raw: readonly MoveSample[]): boolean {
  return shoulderRollCount(raw) >= calibrationConfig.bodyReset.rollCount;
}

/** Left and right are the person's sides. A negative roll is their left. */
export function neckStretchSeen(raw: readonly MoveSample[]): { left: boolean; right: boolean; done: boolean } {
  const min = calibrationConfig.bodyReset.neckRollDeg;
  const rolls = raw.map((sample) => sample.rollDeg ?? 0);
  const left = rolls.some((roll) => roll <= -min);
  const right = rolls.some((roll) => roll >= min);
  return { left, right, done: left && right };
}

/** Chin glides back. A nod, which drops the nose, does not count. */
export function chinTuckSeen(raw: readonly MoveSample[]): boolean {
  const smoothed = smoothSamples(raw);
  const plain = normalize(raw);
  if (smoothed.length < 2) return false;
  const start = smoothed[0]!;
  const { chinFaceDropRatio, chinNoseDropMax, chinShoulderStillRatio, holdMs, holdStillRatio } = calibrationConfig.bodyReset;
  return smoothed.some((sample) => {
    const tucked = start.faceRatio - sample.faceRatio >= chinFaceDropRatio;
    const shouldersStill = Math.abs(sample.shoulderY - start.shoulderY) <= chinShoulderStillRatio;
    const notANod = sample.noseY - start.noseY <= chinNoseDropMax;
    if (!tucked || !shouldersStill || !notANod) return false;
    const window = plain.filter((item) => item.tMs >= sample.tMs && item.tMs <= sample.tMs + holdMs);
    const last = window[window.length - 1];
    if (!last || last.tMs - sample.tMs < holdMs) return false;
    return window.every(
      (item) =>
        start.faceRatio - item.faceRatio >= chinFaceDropRatio - holdStillRatio &&
        Math.abs(item.shoulderY - start.shoulderY) <= chinShoulderStillRatio &&
        item.noseY - start.noseY <= chinNoseDropMax &&
        Math.max(...window.map((row) => row.faceRatio)) - Math.min(...window.map((row) => row.faceRatio)) <= holdStillRatio,
    );
  });
}

export function breathFinished(elapsedMs: number): boolean {
  const { breathInMs, breathOutMs } = calibrationConfig.bodyReset;
  return elapsedMs >= breathInMs + breathOutMs;
}

export function measureRest(landmarks: Landmarks, tMs: number): RestSample | null {
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  const nose = landmarks.nose;
  if (!left || !right || !nose) return null;
  const shoulderWidth = dist(left, right);
  if (shoulderWidth < 8) return null;
  const head = headPoint(landmarks);
  if (!head) return null;
  const faceWidth = landmarks.leftEye && landmarks.rightEye ? dist(landmarks.leftEye, landmarks.rightEye) : 0;
  return {
    tMs,
    shoulderGap: ((left.y + right.y) / 2 - head.y) / shoulderWidth,
    tiltDeg: tiltFromHorizontalDeg(left, right),
    faceRatio: faceWidth / shoulderWidth,
    shoulderY: (left.y + right.y) / 2 / shoulderWidth,
    noseY: nose.y / shoulderWidth,
    shoulderWidthPx: shoulderWidth,
    irisPx: irisDiameterPx(landmarks) ?? null,
  };
}

/** Mean of the last couple of seconds, plus how much the shoulders and nose wandered. */
export function averageRest(samples: readonly RestSample[]): RestSnapshot | null {
  if (samples.length === 0) return null;
  const last = samples[samples.length - 1]!.tMs;
  const window = samples.filter((sample) => last - sample.tMs <= calibrationConfig.bodyReset.averageMs);
  const used = window.length > 0 ? window : samples;
  return {
    shoulderGap: mean(used.map((sample) => sample.shoulderGap)),
    tiltDeg: mean(used.map((sample) => Math.abs(sample.tiltDeg))),
    faceRatio: mean(used.map((sample) => sample.faceRatio)),
    jitter: Math.max(range(used.map((sample) => sample.shoulderY)), range(used.map((sample) => sample.noseY))),
    shoulderWidthPx: mean(used.map((sample) => sample.shoulderWidthPx)),
    irisPx: mean(used.map((sample) => sample.irisPx ?? 0)) || null,
    shoulderY: mean(used.map((sample) => sample.shoulderY)),
  };
}

/** A single sit, before there is anything to compare. Used as the meter's Before mark. */
export function baselineScore(snapshot: RestSnapshot): number {
  const { points, typicalLooseGap, levelMaxDeg, jitterMax } = calibrationConfig.bodyReset;
  const drop = snapshot.shoulderGap >= typicalLooseGap ? points.drop : Math.round(Math.max(0, Math.min(1, snapshot.shoulderGap / typicalLooseGap)) * points.drop);
  const level = snapshot.tiltDeg <= levelMaxDeg ? points.level : 0;
  const settled = snapshot.jitter <= jitterMax ? points.settled : 0;
  return Math.min(100, drop + level + points.stacked + settled);
}

export function scoreLooseness(before: RestSnapshot, after: RestSnapshot): Looseness {
  const { points, shoulderDropShare, typicalLooseGap, levelMaxDeg, headForwardRatio, jitterMax } = calibrationConfig.bodyReset;
  const dropPoints = shoulderDropPoints(before.shoulderGap, after.shoulderGap, typicalLooseGap, shoulderDropShare, points.drop);
  const level = after.tiltDeg <= levelMaxDeg;
  const stacked = before.faceRatio <= 0 || after.faceRatio <= before.faceRatio * (1 + headForwardRatio);
  const settled = after.jitter <= jitterMax;
  const score = dropPoints + (level ? points.level : 0) + (stacked ? points.stacked : 0) + (settled ? points.settled : 0);
  const reason = score >= calibrationConfig.bodyReset.looseScore ? null : biggestGap(dropPoints, level, stacked, settled);
  return { score, dropPoints, level, stacked, settled, reason, message: reason ? loosenessMessage(reason) : null, retry: reason ? retryFor(reason) : null };
}

export function shoulderDropInches(before: RestSnapshot, after: RestSnapshot): number | null {
  const iris = after.irisPx;
  if (!iris || iris <= 0) return null;
  const pixels = (after.shoulderGap - before.shoulderGap) * after.shoulderWidthPx;
  const inches = (pixels * (postureConfig.irisMm / 25.4)) / iris;
  if (!Number.isFinite(inches) || inches < calibrationConfig.bodyReset.dropMinIn) return null;
  return Math.round(inches * 10) / 10;
}

export function loosenessMessage(reason: LoosenessReason): string {
  if (reason === 'shoulders') return "Your shoulders are still a little up. Let's do one more roll.";
  if (reason === 'head') return 'Your head drifted forward. One more chin glide.';
  if (reason === 'level') return "One shoulder is a little higher. Let's do one more roll.";
  return "You're still settling. One more slow breath.";
}

function shoulderDropPoints(beforeGap: number, afterGap: number, typical: number, share: number, max: number): number {
  if (beforeGap >= typical) return max;
  if (beforeGap <= 0) return afterGap > beforeGap ? max : 0;
  const growth = (afterGap - beforeGap) / beforeGap;
  if (growth >= share) return max;
  if (growth <= 0) return 0;
  return Math.round((growth / share) * max);
}

function biggestGap(dropPoints: number, level: boolean, stacked: boolean, settled: boolean): LoosenessReason {
  const { points } = calibrationConfig.bodyReset;
  const lost: Array<{ reason: LoosenessReason; points: number }> = [
    { reason: 'shoulders', points: points.drop - dropPoints },
    { reason: 'head', points: stacked ? 0 : points.stacked },
    { reason: 'level', points: level ? 0 : points.level },
    { reason: 'settled', points: settled ? 0 : points.settled },
  ];
  return lost.reduce((best, item) => (item.points > best.points ? item : best)).reason;
}

function retryFor(reason: LoosenessReason): Looseness['retry'] {
  if (reason === 'shoulders' || reason === 'level') return 'shoulders';
  if (reason === 'head') return 'chin';
  return 'breath';
}

function headPoint(landmarks: Landmarks): Point2D | null {
  if (landmarks.leftEar && landmarks.rightEar) {
    return { x: (landmarks.leftEar.x + landmarks.rightEar.x) / 2, y: (landmarks.leftEar.y + landmarks.rightEar.y) / 2 };
  }
  if (landmarks.leftEye && landmarks.rightEye) {
    return { x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2, y: (landmarks.leftEye.y + landmarks.rightEye.y) / 2 };
  }
  return landmarks.nose ?? null;
}

function normalize(raw: readonly MoveSample[]): NormSample[] {
  return raw
    .filter((sample) => sample.shoulderWidth > 0)
    .map((sample) => ({
      tMs: sample.tMs,
      shoulderY: sample.shoulderMidY / sample.shoulderWidth,
      faceRatio: sample.faceWidth / sample.shoulderWidth,
      noseY: sample.noseY / sample.shoulderWidth,
    }));
}

function smoothSamples(raw: readonly MoveSample[]): NormSample[] {
  const tau = calibrationConfig.bodyReset.smoothMs;
  const out: NormSample[] = [];
  let shoulderY = 0;
  let faceRatio = 0;
  let noseY = 0;
  let ready = false;
  let prevT = 0;
  for (const sample of normalize(raw)) {
    if (!ready) {
      shoulderY = sample.shoulderY;
      faceRatio = sample.faceRatio;
      noseY = sample.noseY;
      ready = true;
    } else {
      const alpha = 1 - Math.exp(-Math.max(0, sample.tMs - prevT) / tau);
      shoulderY += alpha * (sample.shoulderY - shoulderY);
      faceRatio += alpha * (sample.faceRatio - faceRatio);
      noseY += alpha * (sample.noseY - noseY);
    }
    prevT = sample.tMs;
    out.push({ tMs: sample.tMs, shoulderY, faceRatio, noseY });
  }
  return out;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function range(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}
