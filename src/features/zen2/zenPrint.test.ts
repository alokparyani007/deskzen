import { describe, expect, it, vi } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';

const records = new Map<string, unknown>();

vi.mock('../../lib/storage/local-data', () => ({
  loadRecord: async (key: string) => records.get(key) ?? null,
  saveRecord: async (key: string, value: unknown) => {
    records.set(key, value);
  },
}));

import { buildZenV2, jsonHasNoImage, loadZenPrint, mergeZenPrint, saveZenPrint, zenPrintRecord } from './zenPrint';
import type { PoseBaseline } from './poseRules';
import { emptyLibrary, type PosturePrint } from '../../calibration/print';

const baseline: PoseBaseline = {
  shoulderMidX: 0.5,
  shoulderMidY: 0.6,
  shoulderWidth: 0.4,
  faceWidth: 0.16,
  noseOffset: 0.02,
  neckRatio: 0.55,
  faceShoulderRatio: 0.4,
  shoulderRollDeg: 1,
  headRollDeg: 0,
  eyeLineY: 0.35,
  pitchDeg: 0,
  yawDeg: 0,
  distanceIn: 24,
};

function zen(mode: 'sit' | 'stand') {
  return buildZenV2({
    mode,
    createdAt: '2026-11-02T18:00:00.000Z',
    video: { width: 1280, height: 720 },
    outline: Array.from({ length: 150 }, (_, index) => ({ x: 0.4 + (index % 10) * 0.01, y: 0.2 + (index % 15) * 0.02 })),
    baseline,
    points: {
      nose: { x: 0.5, y: 0.33 },
      leftEye: { x: 0.46, y: 0.35 },
      rightEye: { x: 0.54, y: 0.35 },
      leftShoulder: { x: 0.3, y: 0.6 },
      rightShoulder: { x: 0.7, y: 0.6 },
    },
    rulesAtSnap: { R2: { value: 0.5, pass: true } },
    forced: false,
    fitAtLock: 92,
  });
}

function frame(): Landmarks {
  return {
    timestampMs: 1,
    videoWidth: 1280,
    videoHeight: 720,
    faceCount: 1,
    nose: { x: 640, y: 240, visibility: 0.99 },
    leftEye: { x: 590, y: 250, visibility: 0.99 },
    rightEye: { x: 690, y: 250, visibility: 0.99 },
    leftShoulder: { x: 380, y: 430, visibility: 0.99 },
    rightShoulder: { x: 900, y: 430, visibility: 0.99 },
  };
}

describe('zen print', () => {
  it('saves a standing print without deleting sitting', async () => {
    records.clear();
    const sitting = zenPrintRecord({ zen: zen('sit'), frame: frame(), deskProfileId: 'home' });
    const standing = zenPrintRecord({ zen: zen('stand'), frame: frame(), deskProfileId: 'home' });
    const library = mergeZenPrint(mergeZenPrint(emptyLibrary(), sitting), standing);
    expect(library.prints.map((item) => item.mode).sort()).toEqual(['sit', 'stand']);
    await saveZenPrint({ zen: zen('stand'), frame: frame(), deskProfileId: 'home' });
    await saveZenPrint({ zen: zen('sit'), frame: frame(), deskProfileId: 'home' });
    expect(await loadZenPrint('stand', 'home', false)).toMatchObject({ mode: 'stand', zen: { version: 3, mode: 'stand' } });
    expect(await loadZenPrint('sit', 'home', false)).toMatchObject({ mode: 'sit', zen: { version: 3 } });
    const stored = records.get('posture-prints') as { prints: PosturePrint[] };
    expect(jsonHasNoImage(stored)).toBe(true);
    expect(stored.prints.find((item) => item.mode === 'sit')?.zen?.outline).toHaveLength(150);
  });
});
