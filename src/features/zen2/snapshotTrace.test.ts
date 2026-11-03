import { describe, expect, it } from 'vitest';
import type { Landmark, Landmarks, NormPoint } from '../../lib/posture/types';
import { mergePersonClasses, PERSON_CLASSES } from '../../lib/vision/multiclass';
import { outlineFromMask, shoulderTopsOnOutline } from './snapshotOutline';
import { traceSnapshot } from './snapshotTrace';
import { zenConfig } from './zenConfig';

const VW = 1280;
const VH = 720;
const point = (x: number, y: number): Landmark => ({ x, y, visibility: 0.99 });
const seated: Landmarks = {
  timestampMs: 1,
  videoWidth: VW,
  videoHeight: VH,
  faceCount: 1,
  nose: point(640, 270),
  leftEye: point(610, 235),
  rightEye: point(670, 235),
  leftShoulder: point(470, 460),
  rightShoulder: point(810, 460),
  faceBox: { x: (640 - 75) / VW, y: 180 / VH, w: 150 / VW, h: 170 / VH },
};

/** Synthetic multiclass-style person confidence: body 0.96, a merged chair edge at 0.7 above the right shoulder. */
function personGrid(width: number, height: number, options: { hairHalf?: number; chair?: number; armSpread?: number } = {}) {
  const values = new Float32Array(width * height);
  const hair = options.hairHalf ?? 80;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const vx = ((x + 0.5) / width) * VW;
      const vy = ((y + 0.5) / height) * VH;
      const dx = vx - 640;
      let v = 0.04;
      if ((dx / hair) ** 2 + ((vy - 250) / 104) ** 2 <= 1) v = 0.96;
      else if (vy >= 320 && Math.abs(dx) <= 50) v = 0.96;
      else if (vy >= 420 && Math.abs(dx) <= 200 + (options.armSpread ?? 40) * ((vy - 420) / 300)) v = 0.96;
      else if (options.chair !== undefined && vx >= 690 && vx < 860 && vy >= 360 && vy < 420) v = options.chair;
      values[y * width + x] = v;
    }
  }
  return { width, height, values };
}

function topAt(points: readonly NormPoint[], vx: number): number {
  const x = vx / VW;
  let top = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    const y = (a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y)) * VH;
    if (y > 300 && y < top) top = y;
  }
  return top;
}

describe('multiclass snapshot mask', () => {
  it('follows arms that reach well past the shoulders (sitting close), no straight box sides', async () => {
    // Shoulders 470..810 (340 px wide). The arms spread to 640 +- 440 at the frame bottom, far past
    // the old shoulder + 0.35 x width limit (351..929) that cut them into straight vertical sides.
    const wide = personGrid(256, 256, { armSpread: 240 });
    const traced = await traceSnapshot({ multiclass: async () => wide, binary: async () => null }, seated, 'sit', null);
    expect(traced.source).toBe('multiclass');
    expect(traced.guided).toEqual({ left: false, right: false });
    const points = traced.points!;
    expect(points).not.toBeNull();
    const low = points.filter((p) => p.y * VH > 640 && p.y * VH < 700);
    expect(Math.min(...low.map((p) => p.x * VW))).toBeLessThan(300);
    expect(Math.max(...low.map((p) => p.x * VW))).toBeGreaterThan(980);
  });

  it('merges hair, body skin, face skin and clothes; leaves background and others out', () => {
    expect(PERSON_CLASSES).toEqual([1, 2, 3, 4]);
    const n = 4;
    const make = (values: number[]) => Float32Array.from(values);
    const masks = [
      make([0.9, 0.1, 0.0, 0.2]), // background
      make([0.05, 0.6, 0.0, 0.1]), // hair
      make([0.02, 0.1, 0.0, 0.1]), // body skin
      make([0.01, 0.1, 0.0, 0.1]), // face skin
      make([0.02, 0.5, 0.1, 0.1]), // clothes
      make([0.0, 0.0, 0.9, 0.4]), // others: a chair or a prop
    ];
    const merged = mergePersonClasses(masks, n, 1)!;
    expect(Array.from(merged).map((v) => Math.round(v * 100) / 100)).toEqual([0.1, 1, 0.1, 0.4]);
    expect(mergePersonClasses(masks.slice(0, 4), n, 1)).toBeNull();
    expect(mergePersonClasses([masks[0], masks[1], null, masks[3], masks[4]], n, 1)).toBeNull();
    expect(mergePersonClasses(masks, 0, 0)).toBeNull();
  });

  it('uses the multiclass mask with loose limits, and falls back to the binary mask', async () => {
    const clean = personGrid(256, 256);
    const multi = await traceSnapshot({ multiclass: async () => clean, binary: async () => null }, seated, 'sit', null);
    expect(multi.source).toBe('multiclass');
    expect(multi.points).not.toBeNull();

    let binaryCalls = 0;
    const binary = async () => {
      binaryCalls += 1;
      return personGrid(256, 256);
    };
    const failedLoad = await traceSnapshot({ multiclass: async () => null, binary }, seated, 'sit', null);
    expect(failedLoad.source).toBe('binary');
    expect(failedLoad.points).not.toBeNull();
    const threw = await traceSnapshot({ multiclass: () => Promise.reject(new Error('model failed')), binary }, seated, 'sit', null);
    expect(threw.source).toBe('binary');
    const empty = await traceSnapshot({ multiclass: async () => ({ width: 16, height: 16, values: new Float32Array(256) }), binary }, seated, 'sit', null);
    expect(empty.source).toBe('binary');
    expect(binaryCalls).toBe(3);
    const none = await traceSnapshot({ multiclass: async () => null, binary: async () => null }, seated, 'sit', null);
    expect(none).toEqual({ points: null, reason: 'trace-failed', source: 'none' });
  });

  it('leaves a merged chair edge out and keeps full hair width with a clean mask', () => {
    const traced = outlineFromMask(personGrid(320, 180, { chair: 0.7, hairHalf: 100 }), seated, 'sit', null, { clean: true });
    expect(traced.points).not.toBeNull();
    const points = traced.points ?? [];
    for (const vx of [730, 760, 790]) expect(Math.abs(topAt(points, vx) - 420)).toBeLessThan(0.01 * VH);
    const video = points.map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const temple = video.filter((item) => Math.abs(item.y - 250) < 10);
    const width = Math.max(...temple.map((item) => item.x)) - Math.min(...temple.map((item) => item.x));
    // Real hair 200 px wide; the strict head limit (headWiden x face) would cut it to about 162.
    expect(width).toBeGreaterThan(190);
    expect(width).toBeLessThan(206);
  });

  it('keeps the Shoulders level dots level when one side rides up on a bad edge', () => {
    // Outline: left shoulder top at 0.60, right side lifted by a chair to 0.50; landmarks level.
    const outline: NormPoint[] = [
      { x: 0.3, y: 1 },
      { x: 0.3, y: 0.6 },
      { x: 0.45, y: 0.6 },
      { x: 0.45, y: 0.2 },
      { x: 0.55, y: 0.2 },
      { x: 0.55, y: 0.5 },
      { x: 0.7, y: 0.5 },
      { x: 0.7, y: 1 },
    ];
    const dots = shoulderTopsOnOutline(outline, seated)!;
    expect(dots.left.y).toBeCloseTo(0.6, 3);
    expect(dots.right.y).toBeCloseTo(0.6, 3);
    // A small real tilt that agrees with the landmarks is kept as drawn.
    const tilted: NormPoint[] = outline.map((item) => (item.x > 0.5 && item.y === 0.5 ? { ...item, y: 0.6 + 0.5 * zenConfig.dotTiltTol } : item));
    const kept = shoulderTopsOnOutline(tilted, seated)!;
    expect(kept.right.y - kept.left.y).toBeCloseTo(0.5 * zenConfig.dotTiltTol, 3);
  });

  it('keeps the whole head when glasses leave a low-confidence band across the eyes', async () => {
    // Glasses: the person classes drop to 0.3 in a band across the eyes; the model puts them in "others".
    const width = 320;
    const height = 180;
    const base = personGrid(width, height);
    const others = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const vx = ((x + 0.5) / width) * VW;
        const vy = ((y + 0.5) / height) * VH;
        if (vy >= 222 && vy < 248 && Math.abs(vx - 640) <= 85) {
          base.values[y * width + x] = 0.3;
          others[y * width + x] = 0.65;
        }
      }
    }
    const traced = outlineFromMask({ ...base, others }, seated, 'sit', null, { clean: true });
    expect(traced.points).not.toBeNull();
    const top = Math.min(...(traced.points ?? []).filter((item) => Math.abs(item.x * VW - 640) < 40).map((item) => item.y * VH));
    // Hair crown at 146: the line goes over the head, not across the nose.
    expect(Math.abs(top - 146)).toBeLessThan(0.015 * VH);
    // Without the others channel the head piece splits off: the multiclass trace is rejected and the
    // binary mask is used instead of a head-less line.
    const split = await traceSnapshot({ multiclass: async () => base, binary: async () => personGrid(256, 256) }, seated, 'sit', null);
    expect(split.source).toBe('binary');
    const splitTop = Math.min(...(split.points ?? []).filter((item) => Math.abs(item.x * VW - 640) < 40).map((item) => item.y * VH));
    expect(splitTop).toBeLessThan(200);
  });

  it('always gives two Shoulders level dots on the outline, on opposite sides, in a mirrored frame', () => {
    // Mirrored camera: the "left" shoulder is at the larger x, with a small real tilt. The old slope
    // used Math.max(1, dx) and threw one dot off the frame (a vertical line with one dot).
    const mirrored: Landmarks = { ...seated, leftShoulder: point(810, 455), rightShoulder: point(470, 465) };
    const traced = outlineFromMask(personGrid(320, 180), mirrored, 'sit', null, { clean: true });
    const dots = shoulderTopsOnOutline(traced.points, mirrored)!;
    expect(dots).not.toBeNull();
    for (const dot of [dots.left, dots.right]) {
      expect(dot.y).toBeGreaterThan(0.45);
      expect(dot.y).toBeLessThan(0.75);
      expect(Math.abs(dot.y * VH - topAt(traced.points ?? [], dot.x * VW))).toBeLessThan(0.01 * VH);
    }
    expect(dots.left.x).toBeGreaterThan(0.5);
    expect(dots.right.x).toBeLessThan(0.5);
    expect(Math.abs(dots.left.x - dots.right.x) * VW).toBeGreaterThan(0.3 * 340);
    expect(Math.abs(dots.left.y - dots.right.y) * VH).toBeLessThan(0.03 * VH);
    // No usable outline crossing in the shoulder band: null (the caller uses the landmarks), never a vertical pair.
    expect(shoulderTopsOnOutline([{ x: 0.49, y: 0.1 }, { x: 0.51, y: 0.1 }, { x: 0.5, y: 0.2 }], mirrored)).toBeNull();
  });
});
