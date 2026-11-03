import { aggregateFrames } from '../../calibration/aggregate';
import { lockedPoseFromFrames } from '../../calibration/lockedPose';
import { calibrationConfig, type FeatureKey } from '../../calibration/config';
import { PRINTS_RECORD_KEY, type PosturePrint } from '../../calibration/print';
import { loadPrintLibrary } from '../../calibration/store';
import { thresholdFromSlouch } from '../../calibration/thresholds';
import { saveRecord } from '../../lib/storage/local-data';
import type { Landmarks } from '../../lib/posture/types';
import type { Silhouette } from '../../lib/posture/silhouette';

/** Writes the sitting print under posture-prints. Does not touch the baseline keys. */
export async function saveSittingPrint(input: {
  deskProfileId: string;
  zen: Landmarks[];
  slouch: Landmarks[];
  confidence: number;
  catchMeDetected?: boolean;
  coached?: 'full' | 'partial' | 'skipped';
  silhouette?: Silhouette;
  slouchSilhouette?: Silhouette;
}): Promise<void> {
  const zen = aggregateFrames(input.zen.map((landmarks) => ({ landmarks })));
  const slouch = aggregateFrames(input.slouch.map((landmarks) => ({ landmarks })));
  const slouchDelta: PosturePrint['slouchDelta'] = {};
  const weights: PosturePrint['weights'] = {};
  const keys = Object.keys(calibrationConfig.floor) as FeatureKey[];
  for (const key of keys) {
    const base = zen.values[key];
    if (base === undefined) continue;
    const seen = input.slouch.length > 0 ? slouch.values[key] : undefined;
    if (seen === undefined) {
      slouchDelta[key] = calibrationConfig.defaultThreshold[key];
      weights[key] = calibrationConfig.fullWeight;
      continue;
    }
    const line = thresholdFromSlouch(key, base, seen, zen.spread[key] ?? 0);
    slouchDelta[key] = line.slouchDelta;
    weights[key] = line.weight;
  }
  const sample = input.zen[0];
  const now = new Date().toISOString();
  const print: PosturePrint = {
    version: 2,
    mode: 'sit',
    deskProfileId: input.deskProfileId,
    createdAt: now,
    updatedAt: now,
    anchor: { values: zen.values, spread: zen.spread },
    current: { values: { ...zen.values }, spread: { ...zen.spread } },
    slouchDelta,
    weights,
    confidence: input.confidence,
    catchMeDetected: input.catchMeDetected ?? false,
    coached: input.coached,
    lockedPose: lockedPoseFromFrames(input.zen) ?? undefined,
    silhouette: input.silhouette,
    slouchSilhouette: input.slouchSilhouette,
    external: zen.external ?? {
      faceScale: 0,
      headX: 0,
      headY: 0,
      pitch: 0,
      yaw: 0,
      shoulderWidthPx: 0,
    },
    camera: {
      deviceId: '',
      label: '',
      width: sample?.videoWidth ?? 0,
      height: sample?.videoHeight ?? 0,
    },
  };
  const library = await loadPrintLibrary();
  const prints = library.prints.filter((item) => !(item.mode === 'sit' && item.deskProfileId === input.deskProfileId));
  await saveRecord(PRINTS_RECORD_KEY, { version: 2, prints: [...prints, print] });
}
