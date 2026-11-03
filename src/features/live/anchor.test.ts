import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Landmark, Landmarks, NormPoint } from '../../lib/posture/types';
import { OutlineSvg, bottomInsetFor } from '../zen2/OutlineSvg';
import { fitScore } from '../zen2/fitScore';
import { zenConfig } from '../zen2/zenConfig';
import { AnchorSmoother, anchoredTarget, measureAnchor, OneEuro, type SavedTarget } from './anchor';

const VW = 1280;
const VH = 720;
const pt = (x: number, y: number, visibility = 0.99): Landmark => ({ x, y, visibility });

/** Saved target: head dome over the shoulders, flat bottom on the frame edge. Normalized, unmirrored. */
const outline: NormPoint[] = [
  { x: 0.5, y: 0.1 },
  { x: 0.58, y: 0.16 },
  { x: 0.59, y: 0.36 },
  { x: 0.55, y: 0.5 },
  { x: 0.7, y: 0.6 },
  { x: 0.74, y: 1 },
  { x: 0.26, y: 1 },
  { x: 0.3, y: 0.6 },
  { x: 0.45, y: 0.5 },
  { x: 0.41, y: 0.36 },
  { x: 0.42, y: 0.16 },
];
const target: SavedTarget = {
  video: { width: VW, height: VH },
  outline,
  points: {
    nose: { x: 0.5, y: 0.32 },
    leftEye: { x: 0.53, y: 0.26 },
    rightEye: { x: 0.47, y: 0.26 },
    leftShoulder: { x: 0.65, y: 0.62 },
    rightShoulder: { x: 0.35, y: 0.62 },
  },
};

function frameAt(dx: number, dy: number, scale = 1, headDrop = 0): Landmarks {
  const at = (p: NormPoint, drop = 0) => {
    const x = 640 + (p.x * VW - 640) * scale + dx;
    const y = 446.4 + (p.y * VH - 446.4) * scale + dy + drop;
    return pt(x, y);
  };
  const p = target.points;
  return {
    timestampMs: 0,
    videoWidth: VW,
    videoHeight: VH,
    faceCount: 1,
    nose: at(p.nose, headDrop),
    leftEye: at(p.leftEye, headDrop),
    rightEye: at(p.rightEye, headDrop),
    leftShoulder: at(p.leftShoulder),
    rightShoulder: at(p.rightShoulder),
  } as Landmarks;
}

const mid = (points: { leftShoulder: NormPoint; rightShoulder: NormPoint }) => ({ x: (points.leftShoulder.x + points.rightShoulder.x) / 2, y: (points.leftShoulder.y + points.rightShoulder.y) / 2 });

describe('Live view anchoring', () => {
  it('moves and scales the saved outline with the shoulder midpoint (translation + uniform scale)', () => {
    const frame = frameAt(90, 20, 1.1);
    const anchor = measureAnchor(target, frame, null)!;
    expect(anchor.scale).toBeCloseTo(1.1, 3);
    const placed = anchoredTarget(target, anchor, frame);
    const m = mid(placed.points);
    expect(m.x * VW).toBeCloseTo((frame.leftShoulder!.x + frame.rightShoulder!.x) / 2, 3);
    expect(m.y * VH).toBeCloseTo(frame.leftShoulder!.y, 3);
    // Uniform scale: every saved distance grows by the same factor, horizontally and vertically.
    const a = placed.outline[0]!;
    const b = placed.outline[2]!;
    const savedD = Math.hypot((outline[2]!.x - outline[0]!.x) * VW, (outline[2]!.y - outline[0]!.y) * VH);
    expect(Math.hypot((b.x - a.x) * VW, (b.y - a.y) * VH) / savedD).toBeCloseTo(1.1, 3);
    // The bottom stays closed on the frame edge.
    expect(placed.outline[5]!.y).toBeGreaterThanOrEqual(1);
    expect(placed.outline[6]!.y).toBeGreaterThanOrEqual(1);
  });

  it('never rotates the outline, even when the shoulders tilt', () => {
    const frame = frameAt(0, 0);
    frame.leftShoulder = pt(frame.leftShoulder!.x, frame.leftShoulder!.y - 40);
    frame.rightShoulder = pt(frame.rightShoulder!.x, frame.rightShoulder!.y + 40);
    const placed = anchoredTarget(target, measureAnchor(target, frame, null)!, frame);
    // The head top stays straight above the head centre, and the two saved shoulder points stay level.
    expect(placed.points.leftShoulder.y).toBeCloseTo(placed.points.rightShoulder.y, 6);
    const angle = Math.atan2((placed.outline[2]!.y - placed.outline[10]!.y) * VH, (placed.outline[2]!.x - placed.outline[10]!.x) * VW);
    const savedAngle = Math.atan2((outline[2]!.y - outline[10]!.y) * VH, (outline[2]!.x - outline[10]!.x) * VW);
    expect(angle).toBeCloseTo(savedAngle, 6);
  });

  it('still shows a slouch: a head drop with fixed shoulders leaves the head below the target and lowers the match', () => {
    const still = frameAt(30, 0);
    const slouch = frameAt(30, 0, 1, 0.09 * VH);
    const score = (frame: Landmarks) => {
      const placed = anchoredTarget(target, measureAnchor(target, frame, null), frame);
      const n = (p: Landmark) => ({ x: p.x / VW, y: p.y / VH });
      return {
        placed,
        fit: fitScore(
          { outline: null, landmarks: { nose: placed.points.nose, eyeMid: { x: (placed.points.leftEye.x + placed.points.rightEye.x) / 2, y: placed.points.leftEye.y }, leftShoulder: placed.points.leftShoulder, rightShoulder: placed.points.rightShoulder, shoulderWidth: 0.3 } },
          { outline: null, landmarks: { nose: n(frame.nose!), eyeMid: { x: (frame.leftEye!.x + frame.rightEye!.x) / 2 / VW, y: frame.leftEye!.y / VH }, leftShoulder: n(frame.leftShoulder!), rightShoulder: n(frame.rightShoulder!), shoulderWidth: 0.3 }, rulesPassed: 1, rulesTotal: 1 },
        ).percent!,
      };
    };
    const a = score(still);
    const b = score(slouch);
    // The target did not follow the head down.
    expect(b.placed.points.nose.y).toBeCloseTo(a.placed.points.nose.y, 6);
    expect(slouch.nose!.y / VH - b.placed.points.nose.y).toBeGreaterThan(0.08);
    expect(a.fit).toBeGreaterThan(95);
    expect(b.fit).toBeLessThan(a.fit - 15);
    // A whole-trunk sink is only followed up to anchorMaxShift x shoulder width.
    const sunk = frameAt(0, 0.3 * VH);
    const anchor = measureAnchor(target, sunk, null)!;
    const sw = 0.3 * VW;
    expect(anchor.y - 0.62 * VH).toBeCloseTo(zenConfig.live.anchorMaxShift * sw, 3);
  });

  it('uses the eyes for x and scale (never y) when the shoulders are not seen', () => {
    const frame = frameAt(60, 50);
    frame.leftShoulder = pt(frame.leftShoulder!.x, frame.leftShoulder!.y, 0.1);
    const anchor = measureAnchor(target, frame, 400)!;
    expect(anchor.x).toBeCloseTo(640 + 60, 3);
    expect(anchor.y).toBe(400);
  });

  it('smooths jitter with a One Euro filter and settles on a steady value', () => {
    const smoother = new AnchorSmoother();
    let last = null as ReturnType<AnchorSmoother['step']>;
    for (let i = 0; i < 90; i += 1) last = smoother.step({ x: 700 + (i % 2 ? 3 : -3), y: 450, scale: 1 }, i * 33);
    expect(Math.abs(last!.x - 700)).toBeLessThan(1.5);
    const filter = new OneEuro(1, 0);
    filter.filter(0, 0);
    let v = 0;
    for (let i = 1; i <= 60; i += 1) v = filter.filter(100, i * 33);
    expect(v).toBeGreaterThan(99);
  });

  it('renders the Live outline as ONE closed path with the bottom closed inside the frame', () => {
    const frame = frameAt(40, 10, 1.05);
    const placed = anchoredTarget(target, measureAnchor(target, frame, null), frame);
    const html = renderToString(
      createElement(OutlineSvg, { saved: placed.outline, videoWidth: VW, videoHeight: VH, viewWidth: 812, viewHeight: 376, bottomInset: zenConfig.live.bottomInset }),
    );
    for (const kind of ['line', 'glow']) {
      const paths = html.match(new RegExp(`<path[^>]*data-outline="${kind}"[^>]*>`, 'g')) ?? [];
      expect(paths).toHaveLength(1);
      const d = /\sd="([^"]+)"/.exec(paths[0]!)?.[1] ?? '';
      expect(d.trim().endsWith('Z')).toBe(true);
      expect(d.match(/M/g)).toHaveLength(1);
      const ys = [...d.matchAll(/(-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => Number(m[2]));
      const cut = 376 - Math.max(zenConfig.live.bottomInset, bottomInsetFor(376));
      expect(cut).toBeLessThanOrEqual(376 - 14);
      expect(Math.max(...ys)).toBeLessThanOrEqual(cut + 0.05);
      expect(Math.max(...ys)).toBeGreaterThan(cut - 1);
    }
    expect(html).toContain('stroke-width="2"');
    expect(html).toContain('stroke-width="6"');
  });
});
