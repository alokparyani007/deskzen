import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';
import { REGIONS, scoreOutline, truthTopAt, type Region } from './__fixtures__/outlineMetrics';
import { loopSteps, shoulderTopsOnOutline } from './snapshotOutline';
import { traceSnapshot } from './snapshotTrace';

/**
 * Regression on three real Step 2 snapshots (navy polo 8:49 and 8:35, grey tee), from numbers only:
 * the multiclass model's background / clothes / others masks (480 wide, uint8) and a hand-checked
 * ground-truth outline. No image is stored, so this runs the real TS trace mask-only (no shirt-edge pass).
 * Distances are % of frame height, both ways between the trace and the ground truth, per region.
 */
interface Fixture {
  name: string;
  landmarks: Landmarks;
  mask: { width: number; height: number; background: string; clothes: string; others: string };
  gt: [number, number][];
}

const fixtures = (JSON.parse(readFileSync(new URL('./__fixtures__/real-outlines.json', import.meta.url), 'utf8')) as { images: Fixture[] }).images;
const decode = (data: string) => new Uint8Array(gunzipSync(Buffer.from(data, 'base64')));

/** Targets: mean <= 0.8% and max <= 2% of frame height in every region. */
const TARGET = { mean: 0.8, max: 2 };
/**
 * Where the mask-only trace does not reach the target yet, the measured value plus a small margin, so
 * nothing gets worse. Neck and jaw corners are within the ground truth's own +-1% labelling
 * uncertainty (collar vs chair); the grey-tee screen-left shoulder needs the picture (the model calls
 * the chair clothes there at shirt confidence); arms max is desk clutter near the frame bottom.
 */
const KNOWN: Record<string, Partial<Record<Region, { mean?: number; max?: number }>>> = {
  'navy-849': { headSides: { max: 3.3 }, neck: { mean: 1.35 }, shoulderR: { mean: 1.1 }, arms: { max: 3.1 } },
  'navy-835': { headSides: { max: 2.3 }, neck: { mean: 2.1, max: 3.2 }, arms: { max: 3.2 } },
  'grey-tee': { headSides: { max: 2.6 }, neck: { mean: 1.5, max: 2.8 }, shoulderL: { mean: 2.75, max: 5.9 }, shoulderR: { mean: 1.25, max: 2.4 }, arms: { mean: 1.3, max: 3.6 } },
};

function sources(fixture: Fixture) {
  const { width, height } = fixture.mask;
  const background = decode(fixture.mask.background);
  const clothesRaw = decode(fixture.mask.clothes);
  const othersRaw = decode(fixture.mask.others);
  const size = width * height;
  const values = new Float32Array(size);
  const others = new Float32Array(size);
  const clothes = new Float32Array(size);
  for (let index = 0; index < size; index += 1) {
    others[index] = othersRaw[index]! / 255;
    clothes[index] = clothesRaw[index]! / 255;
    // Person classes (hair + body skin + face skin + clothes) = 1 - background - others.
    values[index] = Math.min(1, Math.max(0, 1 - background[index]! / 255 - others[index]!));
  }
  return { width, height, values, others, clothes };
}

describe('real snapshot outlines (numeric fixtures)', () => {
  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))('%s: one closed loop that hugs the hand-checked outline', async (name, fixture) => {
    const frame = fixture.landmarks;
    const traced = await traceSnapshot({ multiclass: async () => sources(fixture), binary: async () => null }, frame, 'sit', null);
    expect(traced.source).toBe('multiclass');
    const points = traced.points!;
    expect(points).not.toBeNull();
    const vw = frame.videoWidth;
    const vh = frame.videoHeight;
    const steps = loopSteps(points.map((p) => ({ x: p.x * vw, y: p.y * vh })));
    const median = [...steps].sort((a, b) => a - b)[steps.length >> 1]!;
    expect(Math.max(...steps)).toBeLessThanOrEqual(3 * median);

    const truth = fixture.gt.map(([x, y]) => ({ x, y }));
    const score = scoreOutline(points, truth, frame);
    for (const region of REGIONS) {
      const limit = { ...TARGET, ...(KNOWN[name]?.[region] ?? {}) };
      const got = score.regions[region];
      expect(got.count, `${name} ${region} has points`).toBeGreaterThan(5);
      expect(got.mean, `${name} ${region} mean`).toBeLessThanOrEqual(limit.mean);
      expect(got.max, `${name} ${region} max`).toBeLessThanOrEqual(limit.max);
    }
    // Chair: traced area outside the ground truth above the upper arms.
    expect(score.chair).toBeLessThan(0.8);

    // Shoulders level: both dots, on opposite sides, on the outline, near the true shoulder top, level.
    const dots = shoulderTopsOnOutline(points, frame)!;
    expect(dots).not.toBeNull();
    const sw = Math.abs(frame.leftShoulder!.x - frame.rightShoulder!.x);
    expect(Math.abs(dots.left.x - dots.right.x) * vw).toBeGreaterThan(0.6 * sw);
    for (const dot of [dots.left, dots.right]) {
      const gy = truthTopAt(truth, dot.x * vw, (frame.faceBox!.y + frame.faceBox!.h / 2) * vh)!;
      expect(Math.abs(dot.y * vh - gy) / vh).toBeLessThan(0.025);
    }
    expect(Math.abs(dots.left.y - dots.right.y)).toBeLessThan(0.05);
  });
});
