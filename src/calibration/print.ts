import { calibrationConfig, type FeatureKey } from './config';
import type { LockedPose } from './lockedPose';
import type { Silhouette } from '../lib/posture/silhouette';
import type { ExternalSnapshot } from './features';
import type { Baseline } from '../lib/posture/types';
import type { ZenV2 } from '../features/zen2/zenPrint';

/** Stored beside the existing baseline keys. Those keys are not renamed. */
export const PRINTS_RECORD_KEY = 'posture-prints';

export interface FeatureBundle {
  values: Partial<Record<FeatureKey, number>>;
  spread: Partial<Record<FeatureKey, number>>;
}

export interface PosturePrint {
  version: 2;
  mode: 'sit' | 'stand';
  deskProfileId: string;
  createdAt: string;
  updatedAt: string;
  anchor: FeatureBundle;
  current: FeatureBundle;
  slouchDelta: Partial<Record<FeatureKey, number>>;
  weights: Partial<Record<FeatureKey, number>>;
  confidence: number;
  /** True when Catch Me saw a slouch. False when the step used default thresholds. */
  catchMeDetected?: boolean;
  /** Full when all four lock checks were held. Partial when coaching was shortened. */
  coached?: 'full' | 'partial' | 'skipped';
  /** Averaged mirrored pose from the lock, so Live view can draw the outline. */
  lockedPose?: LockedPose;
  /** Traced body outline. Points and anchors only. Never a photo or mask. */
  silhouette?: Silhouette;
  slouchSilhouette?: Silhouette;
  external: ExternalSnapshot;
  camera: { deviceId: string; label: string; width: number; height: number };
  /** Set my Zen v2 picture outline. Numbers only. Older prints omit this. */
  zen?: ZenV2;
}

export interface PrintLibrary {
  version: 2;
  prints: PosturePrint[];
}

export function emptyLibrary(): PrintLibrary {
  return { version: 2, prints: [] };
}

export function findPrint(library: PrintLibrary, mode: 'sit' | 'stand', deskProfileId: string): PosturePrint | undefined {
  return library.prints.find((print) => print.mode === mode && print.deskProfileId === deskProfileId);
}

/** Auto follows whichever print this desk has. A manual sit or stand choice stays exact. */
export function findLivePrint(library: PrintLibrary, mode: 'sit' | 'stand', deskProfileId: string, auto: boolean): PosturePrint | undefined {
  const exact = findPrint(library, mode, deskProfileId);
  if (exact || !auto) return exact;
  return library.prints.find((print) => print.deskProfileId === deskProfileId) ?? library.prints[0];
}

/** Turns a saved baseline into a low-confidence print. Does not change the baseline. */
export function migrateBaseline(baseline: Baseline, mode: 'sit' | 'stand', deskProfileId: string): PosturePrint {
  const values = valuesFromBaseline(baseline);
  const bundle: FeatureBundle = { values, spread: {} };
  const createdAt = baseline.createdAt;
  return {
    version: 2,
    mode,
    deskProfileId,
    createdAt,
    updatedAt: createdAt,
    anchor: bundle,
    current: { values: { ...values }, spread: {} },
    slouchDelta: {},
    weights: {},
    confidence: calibrationConfig.migratedConfidence,
    external: {
      faceScale: baseline.ipdPx,
      headX: baseline.nose.x,
      headY: baseline.nose.y,
      pitch: 0,
      yaw: 0,
      shoulderWidthPx: baseline.shoulderWidthPx,
    },
    camera: { deviceId: '', label: '', width: baseline.videoWidth, height: baseline.videoHeight },
  };
}

export function migrateBaselines(
  library: PrintLibrary,
  input: { deskProfileId: string; sit: Baseline | null; stand: Baseline | null },
): { library: PrintLibrary; migrated: boolean } {
  let prints = library.prints;
  let migrated = false;
  for (const [mode, baseline] of [
    ['sit', input.sit],
    ['stand', input.stand],
  ] as const) {
    if (!baseline || findPrint({ version: 2, prints }, mode, input.deskProfileId)) continue;
    prints = [...prints, migrateBaseline(baseline, mode, input.deskProfileId)];
    migrated = true;
  }
  return { library: { version: 2, prints }, migrated };
}

function valuesFromBaseline(baseline: Baseline): Partial<Record<FeatureKey, number>> {
  const values: Partial<Record<FeatureKey, number>> = {
    headDrop: baseline.headDropNorm,
    shrug: baseline.shrugNorm,
    rounding: baseline.roundNorm,
  };
  if (baseline.roundNorm > 0) values.leanIn = 1 / baseline.roundNorm;
  if (baseline.elbowAngleDeg !== undefined) {
    values.elbowLeft = baseline.elbowAngleDeg;
    values.elbowRight = baseline.elbowAngleDeg;
  }
  return values;
}

export function isPrintLibrary(value: unknown): value is PrintLibrary {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<PrintLibrary>;
  return record.version === 2 && Array.isArray(record.prints);
}
