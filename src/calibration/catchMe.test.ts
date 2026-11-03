import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../lib/posture/types';
import { heldFor, slouchAmount } from './catchMe';
import { extractFeatures } from './features';
import type { FeatureBundle } from './print';

function person(eyeSpan: number): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    leftEye: { x: 320 - eyeSpan / 2, y: 160, visibility: 1 },
    rightEye: { x: 320 + eyeSpan / 2, y: 160, visibility: 1 },
    leftShoulder: { x: 220, y: 340, visibility: 1 },
    rightShoulder: { x: 420, y: 340, visibility: 1 },
    nose: { x: 320, y: 180, visibility: 1 },
  };
}

function bundleFor(frame: Landmarks): FeatureBundle {
  const values = extractFeatures({ landmarks: frame }).internal;
  const spread: FeatureBundle['spread'] = {};
  for (const key of Object.keys(values) as (keyof typeof values)[]) spread[key] = 0.01;
  return { values, spread };
}

describe('catch me', () => {
  it('detects a lean-in with no head drop, and ignores sitting still', () => {
    const calm = person(40);
    const anchor = bundleFor(calm);
    const leaned = person(80);
    expect(extractFeatures({ landmarks: leaned }).internal.headDrop).toBeCloseTo(extractFeatures({ landmarks: calm }).internal.headDrop ?? 0);
    expect(slouchAmount(leaned, anchor)).toBeGreaterThanOrEqual(3);
    const still = Array.from({ length: 20 }, (_, index) => ({ tMs: index * 100, amount: slouchAmount(calm, anchor) }));
    expect(heldFor(still, 3, 1_500, true)).toBe(false);
  });

  it('needs a continuous 1.5 seconds, then returns under 1 for 1 second', () => {
    expect(heldFor([{ tMs: 0, amount: 4 }, { tMs: 1_400, amount: 0.2 }, { tMs: 2_900, amount: 4 }], 3, 1_500, true)).toBe(false);
    expect(heldFor([{ tMs: 0, amount: 4 }, { tMs: 1_500, amount: 4 }], 3, 1_500, true)).toBe(true);
    expect(heldFor([{ tMs: 0, amount: 0.4 }, { tMs: 1_000, amount: 0.4 }], 1, 1_000, false)).toBe(true);
  });
});
