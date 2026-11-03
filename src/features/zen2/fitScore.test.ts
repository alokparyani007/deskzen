import { describe, expect, it } from 'vitest';
import { fitScore, polygonIou, stepHoldRing, initialHold, type FitLandmarks, type FitSaved } from './fitScore';
import type { NormPoint } from '../../lib/posture/types';

function rect(x: number, y: number, w: number, h: number): NormPoint[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

function shift(points: NormPoint[], dx: number): NormPoint[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y }));
}

const marks: FitLandmarks = {
  nose: { x: 0.5, y: 0.35 },
  eyeMid: { x: 0.5, y: 0.32 },
  leftShoulder: { x: 0.38, y: 0.55 },
  rightShoulder: { x: 0.62, y: 0.55 },
  shoulderWidth: 0.24,
};

function saved(): FitSaved {
  return { outline: rect(0.35, 0.2, 0.3, 0.45), landmarks: marks };
}

describe('fit score', () => {
  it('scores an identical outline at 98 or better', () => {
    const shape = saved();
    const score = fitScore(shape, { outline: shape.outline, landmarks: marks, rulesPassed: 7, rulesTotal: 7 });
    expect(score.percent).not.toBeNull();
    expect(score.percent ?? 0).toBeGreaterThanOrEqual(98);
    expect(polygonIou(shape.outline ?? [], shape.outline ?? [])).toBeGreaterThan(0.98);
  });

  it('drops below 70 when the outline shifts by 10 percent of the frame', () => {
    const shape = saved();
    const liveMarks: FitLandmarks = {
      nose: { x: 0.6, y: 0.35 },
      eyeMid: { x: 0.6, y: 0.32 },
      leftShoulder: { x: 0.48, y: 0.55 },
      rightShoulder: { x: 0.72, y: 0.55 },
      shoulderWidth: 0.24,
    };
    const score = fitScore(shape, { outline: shift(shape.outline ?? [], 0.1), landmarks: liveMarks, rulesPassed: 7, rulesTotal: 7 });
    expect(score.percent).not.toBeNull();
    expect(score.percent ?? 100).toBeLessThan(70);
  });

  it('uses the landmark formula when there is no live outline', () => {
    const liveMarks: FitLandmarks = {
      ...marks,
      nose: { x: 0.512, y: 0.35 },
      eyeMid: { x: 0.512, y: 0.32 },
      leftShoulder: { x: 0.392, y: 0.55 },
      rightShoulder: { x: 0.632, y: 0.55 },
    };
    const score = fitScore(saved(), { outline: null, landmarks: liveMarks, rulesPassed: 4, rulesTotal: 4 });
    expect(score.parts.formula).toBe('landmark');
    expect(score.parts.iou).toBeNull();
    expect(score.percent).toBeCloseTo(86, 0);
  });

  it('returns null instead of zero when landmarks are missing', () => {
    const score = fitScore(saved(), { outline: rect(0.3, 0.2, 0.2, 0.2), landmarks: null, rulesPassed: 0, rulesTotal: 0 });
    expect(score.percent).toBeNull();
    expect(fitScore(null, { outline: null, landmarks: marks, rulesPassed: 0, rulesTotal: 0 }).percent).toBeNull();
  });

  it('pauses a short dip and resets a long one', () => {
    let ring = stepHoldRing(initialHold(), 0, 95);
    ring = stepHoldRing(ring, 2000, 95);
    expect(ring.heldMs).toBe(2000);
    ring = stepHoldRing(ring, 2300, 70);
    ring = stepHoldRing(ring, 2400, 95);
    expect(ring.heldMs).toBe(2000);
    ring = stepHoldRing(ring, 2500, 70);
    ring = stepHoldRing(ring, 3600, 70);
    expect(ring.heldMs).toBe(0);
  });
});
