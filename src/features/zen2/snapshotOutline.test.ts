import { describe, expect, it } from 'vitest';
import type { Landmark, Landmarks, NormPoint } from '../../lib/posture/types';
import { loopSteps, outlineFromMask, resampleClosed, shoulderTopsOnOutline, traceOuter, type SnapshotPixels } from './snapshotOutline';
import { zenConfig } from './zenConfig';

function point(x: number, y: number, visibility = 0.99): Landmark {
  return { x, y, visibility };
}

function paint(width: number, height: number): number[] {
  return Array.from({ length: width * height }, () => 0);
}

function fillRect(values: number[], width: number, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) values[y * width + x] = 1;
  }
}

function fillDisk(values: number[], width: number, height: number, cx: number, cy: number, radius: number): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) values[y * width + x] = 1;
    }
  }
}

function frame(partial: Partial<Landmarks> = {}): Landmarks {
  return {
    timestampMs: 1,
    videoWidth: 120,
    videoHeight: 90,
    faceCount: 1,
    nose: point(60, 28),
    leftEye: point(52, 30),
    rightEye: point(68, 30),
    leftShoulder: point(46, 48),
    rightShoulder: point(74, 48),
    leftElbow: point(44, 72),
    rightElbow: point(76, 72),
    faceBox: { x: 0.36, y: 0.12, w: 0.28, h: 0.34 },
    ...partial,
  };
}

/** Width of a closed polygon along the horizontal line y (outermost crossings). */
function widthAt(points: readonly { x: number; y: number }[], y: number): number {
  const xs: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index]!;
    const b = points[(index + 1) % points.length]!;
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  return xs.length < 2 ? 0 : Math.max(...xs) - Math.min(...xs);
}

// A seated person in a 1280x720 (16:9) frame, in video pixels.
const VW = 1280;
const VH = 720;
const HEAD = { cx: 640, cy: 250, rx: 80, ry: 104 }; // 160 wide, 208 tall: 1.3x
const NECK = { half: 50, top: 320, bottom: 440 };
const SHOULDERS = { top: 420, halfTop: 200, halfBottom: 240 }; // 2.5 to 3 head widths, down to the frame bottom

function personAt(vx: number, vy: number): boolean {
  if (((vx - HEAD.cx) / HEAD.rx) ** 2 + ((vy - HEAD.cy) / HEAD.ry) ** 2 <= 1) return true;
  if (vy >= NECK.top && vy <= NECK.bottom && Math.abs(vx - HEAD.cx) <= NECK.half) return true;
  if (vy >= SHOULDERS.top) {
    const t = (vy - SHOULDERS.top) / (VH - SHOULDERS.top);
    return Math.abs(vx - HEAD.cx) <= SHOULDERS.halfTop + (SHOULDERS.halfBottom - SHOULDERS.halfTop) * t;
  }
  return false;
}

/** The mask covers the whole frame at its own resolution (e.g. a square 256x256 model output). */
function personMask(width: number, height: number): { width: number; height: number; values: Float32Array } {
  const values = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) values[y * width + x] = personAt(((x + 0.5) / width) * VW, ((y + 0.5) / height) * VH) ? 1 : 0;
  }
  return { width, height, values };
}

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

function measure(points: readonly NormPoint[]) {
  const video = points.map((item) => ({ x: item.x * VW, y: item.y * VH }));
  const top = Math.min(...video.map((item) => item.y));
  const rows: { y: number; width: number }[] = [];
  for (let y = Math.ceil(top) + 1; y < NECK.top; y += 1) rows.push({ y, width: widthAt(video, y) });
  const widest = Math.max(...rows.map((row) => row.width));
  // Head middle = middle of the rows that are (nearly) the widest; height mirrors the crown about it.
  const wide = rows.filter((row) => row.width >= widest * 0.98);
  const middle = wide.reduce((sum, row) => sum + row.y, 0) / Math.max(1, wide.length);
  const headHeight = 2 * (middle - top);
  return {
    headWidth: widest,
    headRatio: headHeight / widest,
    neckRatio: widthAt(video, 380) / widest,
    shoulderRatio: widthAt(video, 600) / widest,
    bottom: Math.max(...points.map((item) => item.y)),
    centerX: (Math.min(...video.map((item) => item.x)) + Math.max(...video.map((item) => item.x))) / 2,
  };
}

describe('snapshot outline', () => {
  it.each([
    [256, 256],
    [320, 180],
    [144, 256],
  ])('traces a person-shaped %ix%i mask in a 16:9 frame without stretching', (width, height) => {
    const traced = outlineFromMask(personMask(width, height), seated, 'sit');
    expect(traced.reason).toBe('ok');
    expect(traced.points).toHaveLength(zenConfig.outlinePoints);
    const shape = measure(traced.points ?? []);
    // The true head is 160 x 208 px (1.3x tall), shoulders 2.5x to 3x the head width.
    expect(shape.headWidth).toBeGreaterThan(160 * 0.9);
    expect(shape.headWidth).toBeLessThan(160 * 1.1);
    expect(shape.headRatio).toBeGreaterThan(1.15);
    expect(shape.headRatio).toBeLessThan(1.45);
    expect(shape.neckRatio).toBeLessThan(0.75);
    expect(shape.shoulderRatio).toBeGreaterThan(2.5);
    expect(shape.shoulderRatio).toBeLessThan(3.1);
    expect(shape.bottom).toBeGreaterThan(0.98);
    expect(Math.abs(shape.centerX - 640)).toBeLessThan(12);
  });

  it('gives the same shape from a square low-res mask and a full-res one', () => {
    const low = measure(outlineFromMask(personMask(256, 256), seated, 'sit').points ?? []);
    const high = measure(outlineFromMask(personMask(640, 360), seated, 'sit').points ?? []);
    expect(Math.abs(low.headRatio - high.headRatio)).toBeLessThan(0.08);
    expect(Math.abs(low.shoulderRatio - high.shoulderRatio) / high.shoulderRatio).toBeLessThan(0.05);
  });

  it('keeps the trapezius slope out to the shoulder caps and uses no landmark fallback on a clean mask', () => {
    const traced = outlineFromMask(personMask(256, 256), seated, 'sit');
    expect(traced.guided).toEqual({ left: false, right: false });
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    // Just below the top of the shoulders the outline is already shoulder-wide, outside both landmarks.
    expect(widthAt(video, 455)).toBeGreaterThan(380);
    const xsAt = (y: number) => {
      const xs: number[] = [];
      for (let index = 0; index < video.length; index += 1) {
        const a = video[index]!;
        const b = video[(index + 1) % video.length]!;
        if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
      }
      return xs;
    };
    expect(Math.min(...xsAt(470))).toBeLessThan(470);
    expect(Math.max(...xsAt(470))).toBeGreaterThan(810);
  });

  it('falls back to a landmark-guided shoulder when the mask misses one', () => {
    const mask = personMask(320, 180);
    for (let y = 0; y < 180; y += 1) {
      for (let x = 0; x < 320; x += 1) if ((x + 0.5) * 4 > 700 && (y + 0.5) * 4 > 380) mask.values[y * 320 + x] = 0;
    }
    const traced = outlineFromMask(mask, seated, 'sit');
    expect(traced.reason).toBe('ok');
    expect(traced.guided?.right).toBe(true);
    expect(traced.guided?.left).toBe(false);
    const right = Math.max(...(traced.points ?? []).filter((item) => Math.abs(item.y * VH - 520) < 40).map((item) => item.x * VW));
    expect(right).toBeGreaterThan(810 + 0.1 * 340);
  });

  it('redraws the shoulders from landmarks when a dark chair bleeds into the shirt', () => {
    const mask = personMask(320, 180);
    for (let y = 0; y < 180; y += 1) {
      for (let x = 0; x < 320; x += 1) if ((y + 0.5) * 4 > 380 && (x + 0.5) * 4 > 250 && (x + 0.5) * 4 < 1030) mask.values[y * 320 + x] = 1;
    }
    const traced = outlineFromMask(mask, seated, 'sit');
    expect(traced.guided).toEqual({ left: true, right: true });
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const xs = video.filter((item) => Math.abs(item.y - 600) < 30).map((item) => item.x);
    expect(Math.max(...xs)).toBeGreaterThan(810);
    expect(Math.max(...xs)).toBeLessThan(810 + 0.33 * 340);
    expect(Math.min(...xs)).toBeLessThan(470);
    expect(Math.min(...xs)).toBeGreaterThan(470 - 0.33 * 340);
  });

  it('keeps a merged chair top out of the shoulder band and a hair spike out of the head dome', () => {
    const width = 320;
    const height = 180;
    const mask = personMask(width, height);
    const paintVideo = (x0: number, y0: number, x1: number, y1: number, value: number) => {
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const vx = ((x + 0.5) / width) * VW;
          const vy = ((y + 0.5) / height) * VH;
          if (vx >= x0 && vx < x1 && vy >= y0 && vy < y1) mask.values[y * width + x] = Math.max(mask.values[y * width + x] ?? 0, value);
        }
      }
    };
    // Chair back merged with the shirt, rising above the shoulders. The mask is unsure there (0.5 to 0.75 in
    // real frames); the shoulder guard is now only a loose backstop, so the confidence check must drop it.
    paintVideo(420, 320, 860, 470, 0.65);
    paintVideo(690, 0, 716, 210, 1); // hair spike from the temple to the frame top
    const traced = outlineFromMask(mask, seated, 'sit');
    expect(traced.reason).toBe('ok');
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const faceHalf = 75;
    const crown = 180 - zenConfig.hairRise * 170;
    const chin = 350;
    const sw = 340;
    const sy = 460;
    // Head dome: never above the crown limit, never wider than headWiden x the face.
    expect(Math.min(...video.map((item) => item.y))).toBeGreaterThan(crown - 4);
    for (const item of video.filter((entry) => entry.y < chin - 20)) expect(Math.abs(item.x - 640)).toBeLessThan(faceHalf * zenConfig.headWiden + 6);
    // Shoulder band: the chair is gone, so the line sits on the person's own shoulder top (420),
    // apart from the small concave fillet where the neck meets the shoulders.
    const neckHalf = faceHalf * zenConfig.neckWiden;
    for (const item of video.filter((entry) => entry.y < sy && Math.abs(entry.x - 640) > (entry.y < chin ? faceHalf * zenConfig.headWiden : neckHalf) + 4)) {
      const nearNeck = Math.abs(item.x - 640) < neckHalf + 0.1 * sw;
      expect(item.y).toBeGreaterThan(SHOULDERS.top - (nearNeck ? 0.08 * sw : 5));
    }
  });

  it('closes the head with the dome when the hair runs off the frame top', () => {
    const mask = personMask(320, 180);
    for (let x = 0; x < 320; x += 1) {
      const vx = ((x + 0.5) / 320) * VW;
      for (let y = 0; y < 63; y += 1) if (Math.abs(vx - 640) < 70) mask.values[y * 320 + x] = 1;
    }
    const high: Landmarks = { ...seated, faceBox: { x: (640 - 75) / VW, y: 40 / VH, w: 150 / VW, h: 170 / VH } };
    const traced = outlineFromMask(mask, high, 'sit');
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const top = video.filter((item) => item.y < 8);
    expect(top.length).toBeGreaterThan(0);
    for (const item of top) expect(Math.abs(item.x - 640)).toBeLessThan(75 * zenConfig.headWiden + 4);
  });

  it('smooths stair-steps on the upper-arm edge', () => {
    const width = 320;
    const height = 180;
    const mask = personMask(width, height);
    // Jagged right arm edge: +-5 px stair-steps every 12 px below y = 520 (low-res mask steps).
    for (let y = 0; y < height; y += 1) {
      const vy = ((y + 0.5) / height) * VH;
      if (vy < 520) continue;
      const t = (vy - SHOULDERS.top) / (VH - SHOULDERS.top);
      const edge = 640 + SHOULDERS.halfTop + (SHOULDERS.halfBottom - SHOULDERS.halfTop) * t + (Math.floor(vy / 12) % 2 === 0 ? 5 : -5);
      for (let x = 0; x < width; x += 1) {
        const vx = ((x + 0.5) / width) * VW;
        if (vx > 640) mask.values[y * width + x] = vx <= edge ? 1 : 0;
      }
    }
    const traced = outlineFromMask(mask, seated, 'sit');
    expect(traced.reason).toBe('ok');
    const arm = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH })).filter((item) => item.x > 640 && item.y > 540 && item.y < 690).sort((p, q) => p.y - q.y);
    expect(arm.length).toBeGreaterThan(5);
    // Residual from a straight line through the arm points stays well under the 5 px steps.
    const n = arm.length;
    const my = arm.reduce((sum, item) => sum + item.y, 0) / n;
    const mx = arm.reduce((sum, item) => sum + item.x, 0) / n;
    const slope = arm.reduce((sum, item) => sum + (item.y - my) * (item.x - mx), 0) / arm.reduce((sum, item) => sum + (item.y - my) ** 2, 0);
    const worst = Math.max(...arm.map((item) => Math.abs(item.x - (mx + slope * (item.y - my)))));
    expect(worst).toBeLessThan(2.5);
  });

  it('rounds a boxy (rectangular) head mask into a dome', () => {
    const width = 320;
    const height = 180;
    const values = new Float32Array(width * height);
    const headTop = 120;
    const headBottom = 330;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const vx = ((x + 0.5) / width) * VW;
        const vy = ((y + 0.5) / height) * VH;
        const inHead = vy >= headTop && vy < headBottom && Math.abs(vx - 640) <= 80;
        values[y * width + x] = inHead || personAt(vx, vy) ? 1 : 0;
      }
    }
    const traced = outlineFromMask({ width, height, values }, seated, 'sit');
    expect(traced.reason).toBe('ok');
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const crownY = Math.min(...video.filter((item) => Math.abs(item.x - 640) < 12).map((item) => item.y));
    const cornerY = Math.min(...video.filter((item) => Math.abs(item.x - 640) > 62 && Math.abs(item.x - 640) < 72 && item.y < 260).map((item) => item.y));
    expect(cornerY - crownY).toBeGreaterThan(0.15 * (headBottom - headTop));
    // Symmetric about the head centre.
    const leftEdge = Math.min(...video.filter((item) => item.y > 200 && item.y < 300).map((item) => item.x));
    const rightEdge = Math.max(...video.filter((item) => item.y > 200 && item.y < 300).map((item) => item.x));
    expect(Math.abs(640 - leftEdge - (rightEdge - 640))).toBeLessThan(6);
  });

  function chairMask(): { width: number; height: number; values: Float32Array } {
    const width = 320;
    const height = 180;
    const mask = personMask(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const vx = ((x + 0.5) / width) * VW;
        const vy = ((y + 0.5) / height) * VH;
        if (vx >= 420 && vx < 860 && vy >= 320 && vy < 470) mask.values[y * width + x] = 1;
      }
    }
    return mask;
  }

  function maxTurnDeg(points: readonly NormPoint[]): number {
    const video = points.map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const maxY = Math.max(...video.map((item) => item.y));
    let worst = 0;
    for (let index = 0; index < video.length; index += 1) {
      const a = video[(index - 1 + video.length) % video.length]!;
      const b = video[index]!;
      const c = video[(index + 1) % video.length]!;
      if ([a, b, c].some((item) => item.y > maxY - 0.03 * VH)) continue; // the flat bottom and its two corners
      const turn = Math.abs(Math.atan2((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x), (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)));
      worst = Math.max(worst, (turn * 180) / Math.PI);
    }
    return worst;
  }

  it.each([
    ['clean', () => personMask(256, 256)],
    ['chair', chairMask],
  ])('has no sharp corners anywhere but the bottom (%s mask)', (_name, build) => {
    const traced = outlineFromMask(build(), seated, 'sit');
    expect(traced.points).not.toBeNull();
    expect(maxTurnDeg(traced.points ?? [])).toBeLessThan(35);
  });

  it('replaces a chair-raised shoulder with a curve, not a straight line', () => {
    const traced = outlineFromMask(chairMask(), seated, 'sit');
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const neckHalf = 75 * zenConfig.neckWiden;
    const stretch = video.filter((item) => item.x > 640 + neckHalf + 10 && item.x < 810 && item.y < 460).sort((p, q) => p.x - q.x);
    expect(stretch.length).toBeGreaterThan(4);
    const a = stretch[0]!;
    const b = stretch[stretch.length - 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const deviation = Math.max(...stretch.map((item) => Math.abs((b.x - a.x) * (a.y - item.y) - (a.x - item.x) * (b.y - a.y)) / length));
    expect(deviation).toBeGreaterThan(0.01 * 340);
  });

  it.each([
    ['round', () => personMask(256, 256)],
    ['boxy', () => {
      const width = 320;
      const height = 180;
      const values = new Float32Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const vx = ((x + 0.5) / width) * VW;
          const vy = ((y + 0.5) / height) * VH;
          values[y * width + x] = (vy >= 120 && vy < 330 && Math.abs(vx - 640) <= 80) || personAt(vx, vy) ? 1 : 0;
        }
      }
      return { width, height, values };
    }],
  ])('keeps the head top rounded, never pointed (%s head)', (_name, build) => {
    const traced = outlineFromMask(build(), seated, 'sit');
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    const top = Math.min(...video.map((item) => item.y));
    const band = video.filter((item) => item.y <= top + 0.1 * 208);
    const width = Math.max(...band.map((item) => item.x)) - Math.min(...band.map((item) => item.x));
    expect(width).toBeGreaterThan(0.4 * 160);
  });

  /** A dark leather chair band sitting on the right shoulder (unmirrored), which the mask includes. */
  const CHAIR = { x0: 690, x1: 860, y0: 405, y1: SHOULDERS.top };

  function chairOnShoulderMask(): { width: number; height: number; values: Float32Array } {
    const width = 320;
    const height = 180;
    const mask = personMask(width, height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const vx = ((x + 0.5) / width) * VW;
        const vy = ((y + 0.5) / height) * VH;
        if (vx >= CHAIR.x0 && vx < CHAIR.x1 && vy >= CHAIR.y0 && vy < CHAIR.y1) mask.values[y * width + x] = 1;
      }
    }
    return mask;
  }

  /** The snapshot picture: grey T-shirt from the shoulder top down, skin above it, a brown chair, a pale wall. */
  function chairPicture(): SnapshotPixels {
    const data = new Uint8ClampedArray(VW * VH * 4);
    for (let y = 0; y < VH; y += 1) {
      for (let x = 0; x < VW; x += 1) {
        const vx = x + 0.5;
        const vy = y + 0.5;
        const grain = ((x * 7 + y * 13) % 9) - 4;
        let color = [205, 212, 220];
        if (vx >= CHAIR.x0 && vx < CHAIR.x1 && vy >= CHAIR.y0 && vy < CHAIR.y1) color = [72, 46, 30];
        if (personAt(vx, vy)) color = vy >= SHOULDERS.top ? [150, 152, 155] : [225, 180, 150];
        const at = (y * VW + x) * 4;
        data[at] = color[0]! + grain;
        data[at + 1] = color[1]! + grain;
        data[at + 2] = color[2]! + grain;
        data[at + 3] = 255;
      }
    }
    return { width: VW, height: VH, data };
  }

  /** Outline top edge (video px) in column vx, below the face. */
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

  it('puts the shoulder on the shirt edge, not the chair top, when it has the picture', () => {
    const mask = chairOnShoulderMask();
    const without = outlineFromMask(mask, seated, 'sit');
    const traced = outlineFromMask(mask, seated, 'sit', chairPicture());
    expect(traced.points).not.toBeNull();
    // Without the picture the chair still lifts the line near the neck (the guard is only a soft limit).
    expect(topAt(without.points ?? [], 730)).toBeLessThan(SHOULDERS.top - 0.01 * VH);
    // Neck base to the shoulder point; past it the guard rounds the cap down on its own (no chair involved).
    for (let vx = 715; vx <= 785; vx += 5) expect(Math.abs(topAt(traced.points ?? [], vx) - SHOULDERS.top)).toBeLessThan(0.01 * VH);
    // The other shoulder, with no chair, is unchanged.
    expect(Math.abs(topAt(traced.points ?? [], 550) - topAt(without.points ?? [], 550))).toBeLessThan(2);
    expect(maxTurnDeg(traced.points ?? [])).toBeLessThan(35);
  });

  /** How far the outline's shoulder band sags below its chord, neck fillet to shoulder point (video px). */
  function sag(points: readonly NormPoint[], side: -1 | 1): number {
    const x0 = 640 + side * (75 * zenConfig.neckWiden + 0.1 * 340);
    const x1 = 640 + side * 170;
    const y0 = topAt(points, x0);
    const y1 = topAt(points, x1);
    let worst = 0;
    for (let t = 0; t <= 1; t += 0.05) {
      const vx = x0 + (x1 - x0) * t;
      worst = Math.max(worst, topAt(points, vx) - (y0 + (y1 - y0) * t));
    }
    return worst;
  }

  /** A grey tee in uneven light: a bright lit strip along the top and a dark fold a little lower. */
  function shadedShirtPicture(): SnapshotPixels {
    const data = new Uint8ClampedArray(VW * VH * 4);
    for (let y = 0; y < VH; y += 1) {
      for (let x = 0; x < VW; x += 1) {
        const vx = x + 0.5;
        const vy = y + 0.5;
        const grain = ((x * 7 + y * 13) % 9) - 4;
        let color = [205, 212, 220];
        if (personAt(vx, vy)) {
          if (vy < SHOULDERS.top) color = [225, 180, 150];
          else if (vy < SHOULDERS.top + 10) color = [190, 192, 196];
          else if (vy < SHOULDERS.top + 24) color = [88, 89, 92];
          else if (vy < SHOULDERS.top + 34) color = [120, 121, 124];
          else color = [150, 152, 155];
        }
        const at = (y * VW + x) * 4;
        data[at] = color[0]! + grain;
        data[at + 1] = color[1]! + grain;
        data[at + 2] = color[2]! + grain;
        data[at + 3] = 255;
      }
    }
    return { width: VW, height: VH, data };
  }

  it('does not move the line for shading or folds inside the shirt', () => {
    const mask = personMask(320, 180);
    const without = outlineFromMask(mask, seated, 'sit');
    const traced = outlineFromMask(mask, seated, 'sit', shadedShirtPicture());
    for (let vx = 500; vx <= 785; vx += 5) {
      if (Math.abs(vx - 640) < 75 * zenConfig.neckWiden + 0.1 * 340) continue;
      expect(Math.abs(topAt(traced.points ?? [], vx) - topAt(without.points ?? [], vx))).toBeLessThan(1.5);
    }
  });

  it.each([
    ['clean', () => personMask(320, 180), () => null],
    ['chair', chairOnShoulderMask, chairPicture],
    ['shaded', () => personMask(320, 180), shadedShirtPicture],
  ])('keeps both shoulder bands convex, never sagging below the chord (%s)', (_name, mask, picture) => {
    const traced = outlineFromMask(mask(), seated, 'sit', picture());
    for (const side of [-1, 1] as const) expect(sag(traced.points ?? [], side)).toBeLessThan(0.01 * 340);
  });

  /**
   * Shoulder top measured from Alok's real snapshot (pass 8 screenshot, both sides), as offsets from the
   * chin in shoulder widths against the distance from the neck centre: the shirt top sits about level
   * with the chin beside the neck, falls gently and convexly to about 0.08 below it at the deltoid,
   * then rounds down over the cap. The pose landmarks sit about 0.22 shoulder widths below the chin.
   */
  const REAL = { chin: 350, sw: 340, landmarkY: 425 };
  function realTop(dx: number): number {
    const u = Math.abs(dx) / REAL.sw;
    if (u <= 0.55) return REAL.chin + REAL.sw * (-0.03 + 0.11 * Math.max(0, (u - 0.22) / 0.33) ** 1.6);
    const t = Math.min(1, (u - 0.55) / 0.11);
    return REAL.chin + REAL.sw * (0.08 + 0.22 * (1 - Math.sqrt(1 - t * t)));
  }
  function realPersonAt(vx: number, vy: number): boolean {
    const dx = vx - HEAD.cx;
    if ((dx / HEAD.rx) ** 2 + ((vy - HEAD.cy) / HEAD.ry) ** 2 <= 1) return true;
    if (vy >= NECK.top && Math.abs(dx) <= NECK.half) return true;
    const u = Math.abs(dx) / REAL.sw;
    const reach = 0.66 + Math.max(0, vy - (REAL.chin + 0.3 * REAL.sw)) * 0.0003;
    return u <= reach && vy >= realTop(Math.min(Math.abs(dx), 0.66 * REAL.sw));
  }
  const realFrame: Landmarks = { ...seated, leftShoulder: point(640 - 170, REAL.landmarkY), rightShoulder: point(640 + 170, REAL.landmarkY) };

  it('hugs a real shoulder profile (gentle convex arc to a rounded deltoid) within 1% of the frame', () => {
    const width = 320;
    const height = 180;
    const values = new Float32Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) values[y * width + x] = realPersonAt(((x + 0.5) / width) * VW, ((y + 0.5) / height) * VH) ? 1 : 0;
    }
    const traced = outlineFromMask({ width, height, values }, realFrame, 'sit');
    expect(traced.points).not.toBeNull();
    for (const side of [-1, 1] as const) {
      for (let u = 0.25; u <= 0.56; u += 0.02) {
        const vx = 640 + side * u * REAL.sw;
        expect(Math.abs(topAt(traced.points ?? [], vx) - realTop(u * REAL.sw))).toBeLessThan(0.01 * VH);
      }
    }
    expect(maxTurnDeg(traced.points ?? [])).toBeLessThan(35);
  });

  it.each([
    ['clean', () => outlineFromMask(personMask(256, 256), seated, 'sit')],
    ['chair + picture', () => outlineFromMask(chairOnShoulderMask(), seated, 'sit', chairPicture())],
    ['real shoulder profile', () => {
      const width = 320;
      const height = 180;
      const values = new Float32Array(width * height);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) values[y * width + x] = realPersonAt(((x + 0.5) / width) * VW, ((y + 0.5) / height) * VH) ? 1 : 0;
      }
      return outlineFromMask({ width, height, values }, realFrame, 'sit');
    }],
    ['clean multiclass + detached wisp', () => {
      const mask = personMask(320, 180);
      // A hair wisp the corner rounding cuts loose above the head, and a separate blob at the side.
      for (let y = 8; y < 14; y += 1) for (let x = 158; x < 162; x += 1) mask.values[y * 320 + x] = 1;
      for (let y = 60; y < 80; y += 1) for (let x = 10; x < 30; x += 1) mask.values[y * 320 + x] = 1;
      return outlineFromMask(mask, seated, 'sit', null, { clean: true });
    }],
  ])('traces ONE closed, evenly spaced loop with no jumps (%s)', (_name, run) => {
    const traced = run();
    expect(traced.points).not.toBeNull();
    const video = (traced.points ?? []).map((item) => ({ x: item.x * VW, y: item.y * VH }));
    expect(video.length).toBe(zenConfig.outlinePoints);
    const steps = loopSteps(video);
    const median = [...steps].sort((a, b) => a - b)[steps.length >> 1]!;
    expect(median).toBeGreaterThan(0);
    expect(Math.max(...steps)).toBeLessThanOrEqual(3 * median);
    // Around the person, not a stray blob: it spans the head top to the frame bottom and both shoulders.
    expect(Math.min(...video.map((item) => item.y))).toBeLessThan(200);
    expect(Math.max(...video.map((item) => item.y))).toBeGreaterThan(0.98 * VH);
    expect(Math.max(...video.map((item) => item.x)) - Math.min(...video.map((item) => item.x))).toBeGreaterThan(340);
  });

  it('places the Shoulders level dots on the outline top, on the shirt edge on both sides', () => {
    const traced = outlineFromMask(chairOnShoulderMask(), seated, 'sit', chairPicture());
    const dots = shoulderTopsOnOutline(traced.points, seated);
    expect(dots).not.toBeNull();
    for (const dot of [dots!.left, dots!.right]) {
      expect(Math.abs(dot.y - topAt(traced.points ?? [], dot.x * VW) / VH)).toBeLessThan(0.01);
      expect(Math.abs(dot.y - SHOULDERS.top / VH)).toBeLessThan(0.01);
      // Well above the pose landmarks, which sit low on the upper chest.
      expect(dot.y).toBeLessThan(460 / VH - 0.03);
    }
    expect(dots!.left.x).toBeCloseTo((640 + zenConfig.shoulderDotAt * (470 - 640)) / VW, 3);
    expect(dots!.right.x).toBeCloseTo((640 + zenConfig.shoulderDotAt * (810 - 640)) / VW, 3);
    expect(shoulderTopsOnOutline(null, seated)).toBeNull();
  });

  it('traces a head and torso with a flat bottom and drops the chair beside the arm', () => {
    const width = 120;
    const height = 90;
    const values = paint(width, height);
    fillDisk(values, width, height, 60, 28, 14);
    fillRect(values, width, 46, 36, 75, 82);
    fillRect(values, width, 16, 50, 46, 56);
    fillRect(values, width, 2, 48, 16, 80);
    const traced = outlineFromMask({ width, height, values }, frame(), 'sit');
    expect(traced.reason).toBe('ok');
    expect(traced.points).toHaveLength(zenConfig.outlinePoints);
    for (const item of traced.points ?? []) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(1);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(1);
    }
    const maxY = Math.max(...(traced.points ?? []).map((item) => item.y));
    const bottom = (traced.points ?? []).filter((item) => Math.abs(item.y - maxY) < 0.001);
    expect(bottom.length).toBeGreaterThan(4);
    // Chair (x < 16) gone; arm kept only out to the shoulder margin (46 - 0.3 x 28 = 37.6).
    expect(Math.min(...(traced.points ?? []).map((item) => item.x))).toBeGreaterThan(0.3);
  });

  it('returns trace-failed for an empty mask', () => {
    const traced = outlineFromMask({ width: 40, height: 30, values: paint(40, 30) }, frame({ videoWidth: 40, videoHeight: 30 }), 'sit');
    expect(traced.reason).toBe('trace-failed');
    expect(traced.points).toBeNull();
  });

  it('reports a shoulder cut when the person touches the frame edge', () => {
    const width = 80;
    const height = 60;
    const values = paint(width, height);
    fillDisk(values, width, height, 24, 16, 8);
    fillRect(values, width, 0, 20, 40, 50);
    const body = frame({
      videoWidth: width,
      videoHeight: height,
      nose: point(24, 16),
      leftEye: point(20, 16),
      rightEye: point(28, 16),
      leftShoulder: point(8, 28),
      rightShoulder: point(36, 28),
      leftElbow: point(6, 46),
      rightElbow: point(38, 46),
      faceBox: { x: 0.15, y: 0.1, w: 0.3, h: 0.3 },
    });
    const traced = outlineFromMask({ width, height, values }, body, 'sit');
    expect(traced.reason).toBe('shoulder-cut');
  });

  it('follows the exact outer pixel edge of a blob', () => {
    const grid = new Uint8Array(5 * 4);
    for (let y = 1; y < 3; y += 1) for (let x = 1; x < 4; x += 1) grid[y * 5 + x] = 1;
    const edge = traceOuter(grid, 5, 4);
    expect(edge).toHaveLength(10);
    expect(Math.min(...edge.map((item) => item.x))).toBe(1);
    expect(Math.max(...edge.map((item) => item.x))).toBe(4);
    expect(Math.max(...edge.map((item) => item.y))).toBe(3);
  });

  it('resamples a closed square to the requested count', () => {
    const points = resampleClosed(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ],
      20,
    );
    expect(points).toHaveLength(20);
  });
});
