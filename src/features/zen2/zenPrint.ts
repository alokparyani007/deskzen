import { aggregateFrames } from '../../calibration/aggregate';
import { lockedPoseFromFrames } from '../../calibration/lockedPose';
import { findLivePrint, PRINTS_RECORD_KEY, type PosturePrint, type PrintLibrary } from '../../calibration/print';
import { loadPrintLibrary } from '../../calibration/store';
import { saveRecord } from '../../lib/storage/local-data';
import type { Landmarks, NormPoint } from '../../lib/posture/types';
import type { PoseBaseline } from './poseRules';
import type { PoseMode } from './zenConfig';

export interface ZenV2 {
  version: 3;
  mode: PoseMode;
  createdAt: string;
  video: { width: number; height: number };
  outline: NormPoint[];
  baseline: PoseBaseline;
  points: Record<'nose' | 'leftEye' | 'rightEye' | 'leftShoulder' | 'rightShoulder', NormPoint>;
  rulesAtSnap: Record<string, { value: number | null; pass: boolean }>;
  forced: boolean;
  fitAtLock: number | null;
}

export function buildZenV2(input: Omit<ZenV2, 'version'>): ZenV2 {
  return { version: 3, ...input, mode: input.mode === 'stand' ? 'stand' : 'sit' };
}

export function normFromLandmark(frame: Landmarks, point: { x: number; y: number } | undefined): NormPoint | null {
  if (!point || frame.videoWidth <= 0 || frame.videoHeight <= 0) return null;
  return { x: point.x / frame.videoWidth, y: point.y / frame.videoHeight };
}

export function pointsFromFrame(frame: Landmarks): ZenV2['points'] | null {
  const nose = normFromLandmark(frame, frame.nose);
  const leftEye = normFromLandmark(frame, frame.leftEye);
  const rightEye = normFromLandmark(frame, frame.rightEye);
  const leftShoulder = normFromLandmark(frame, frame.leftShoulder);
  const rightShoulder = normFromLandmark(frame, frame.rightShoulder);
  if (!nose || !leftEye || !rightEye || !leftShoulder || !rightShoulder) return null;
  return { nose, leftEye, rightEye, leftShoulder, rightShoulder };
}

/** Replaces only the print with the same mode and desk. A standing save leaves sitting in place. */
export function mergeZenPrint(library: PrintLibrary, print: PosturePrint): PrintLibrary {
  const prints = library.prints.filter((item) => !(item.mode === print.mode && item.deskProfileId === print.deskProfileId));
  return { version: 2, prints: [...prints, print] };
}

export function zenPrintRecord(input: {
  zen: ZenV2;
  frame: Landmarks;
  deskProfileId: string;
  deviceLabel?: string;
}): PosturePrint {
  const aggregated = aggregateFrames([{ landmarks: input.frame }]);
  const now = input.zen.createdAt;
  return {
    version: 2,
    mode: input.zen.mode,
    deskProfileId: input.deskProfileId,
    createdAt: now,
    updatedAt: now,
    anchor: { values: aggregated.values, spread: aggregated.spread },
    current: { values: { ...aggregated.values }, spread: { ...aggregated.spread } },
    slouchDelta: {},
    weights: {},
    confidence: input.zen.fitAtLock === null ? 0.7 : Math.max(0, Math.min(1, input.zen.fitAtLock / 100)),
    coached: input.zen.forced ? 'partial' : 'full',
    lockedPose: lockedPoseFromFrames([input.frame]) ?? undefined,
    external: aggregated.external ?? {
      faceScale: input.zen.baseline.faceWidth * input.zen.video.width,
      headX: input.zen.points.nose.x,
      headY: input.zen.points.nose.y,
      pitch: input.zen.baseline.pitchDeg ?? 0,
      yaw: input.zen.baseline.yawDeg ?? 0,
      shoulderWidthPx: input.zen.baseline.shoulderWidth * input.zen.video.width,
    },
    camera: {
      deviceId: '',
      label: input.deviceLabel ?? '',
      width: input.zen.video.width,
      height: input.zen.video.height,
    },
    zen: input.zen,
  };
}

export async function saveZenPrint(input: {
  zen: ZenV2;
  frame: Landmarks;
  deskProfileId: string;
  deviceLabel?: string;
}): Promise<void> {
  const library = await loadPrintLibrary();
  const print = zenPrintRecord(input);
  await saveRecord(PRINTS_RECORD_KEY, mergeZenPrint(library, print));
}

export async function loadZenPrint(mode: PoseMode, deskProfileId: string, auto: boolean): Promise<PosturePrint | null> {
  const library = await loadPrintLibrary();
  return findLivePrint(library, mode, deskProfileId, auto) ?? null;
}

export function jsonHasNoImage(value: unknown): boolean {
  const encoded = JSON.stringify(value);
  if (encoded.includes('data:image') || encoded.includes('blob:')) return false;
  return stringsWithin(value, 40);
}

function stringsWithin(value: unknown, limit: number): boolean {
  if (typeof value === 'string') {
    if (value.length <= limit) return true;
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
  }
  if (Array.isArray(value)) return value.every((item) => stringsWithin(item, limit));
  if (value && typeof value === 'object') return Object.values(value).every((item) => stringsWithin(item, limit));
  return true;
}
