import { describe, expect, it } from 'vitest';
import type { Landmarks } from './types';
import { outlineFromMasks } from '../../features/print/contourSample';
import {
  averageMasks,
  choosePersonValues,
  cleanPersonGrid,
  levelShoulderLine,
  outlineIsSane,
  type Point,
} from './silhouette';

describe('clean posture outline', () => {
  it('keeps the component that holds the nose and both shoulders', () => {
    const width = 40;
    const height = 30;
    const values = new Float32Array(width * height);
    fill(values, width, 8, 14, 6, 22);
    fill(values, width, 28, 36, 6, 22);
    const grid = cleanPersonGrid(values, width, height, {
      nose: { x: 12, y: 10 },
      left: { x: 9, y: 16 },
      right: { x: 15, y: 16 },
      face: null,
    });
    expect(grid).not.toBeNull();
    expect(grid?.[10 * width + 12]).toBe(1);
    expect(grid?.[16 * width + 32]).toBe(0);
  });

  it('cuts pixels more than 0.35 shoulder-widths outside the shoulders', () => {
    const width = 50;
    const height = 30;
    const values = new Float32Array(width * height);
    fill(values, width, 2, 47, 8, 24);
    const grid = cleanPersonGrid(values, width, height, {
      nose: { x: 25, y: 12 },
      left: { x: 18, y: 16 },
      right: { x: 32, y: 16 },
      face: null,
    });
    expect(grid).not.toBeNull();
    expect(grid?.[16 * width + 4]).toBe(0);
    expect(grid?.[16 * width + 25]).toBe(1);
    const bottom = 16 + 0.6 * 14;
    expect(grid?.[Math.ceil(bottom + 1) * width + 25] ?? 0).toBe(0);
  });

  it('levels a tilt under 4 degrees and keeps a real lean', () => {
    const mild = levelShoulderLine(
      [
        { x: 0, y: 0 },
        { x: 100, y: 2 },
      ],
      { x: 0, y: 0 },
      { x: 100, y: 2 },
    );
    expect(mild.leveled).toBe(true);
    expect(mild.points[1]?.y).toBeCloseTo(mild.points[0]?.y ?? 0, 1);
    const lean = levelShoulderLine(
      [
        { x: 0, y: 0 },
        { x: 100, y: 20 },
      ],
      { x: 0, y: 0 },
      { x: 100, y: 20 },
    );
    expect(lean.leveled).toBe(false);
    expect(lean.points[1]?.y).toBe(20);
  });

  it('rejects a trace that is too wide or whose head is off center', () => {
    const shoulders = 100;
    expect(outlineIsSane(person(0, -80), 0, shoulders)).toBe(true);
    const wide = person(0, -80).map((point) => ({ x: point.x * 3, y: point.y }));
    expect(outlineIsSane(wide, 0, shoulders)).toBe(false);
    expect(outlineIsSane(person(40, -80), 0, shoulders)).toBe(false);
  });

  it('keeps a centered person and discards a head spike', () => {
    const width = 80;
    const height = 60;
    const values = new Float32Array(width * height);
    fill(values, width, 24, 56, 16, 50);
    const frame = pose();
    frame.nose = { x: 40, y: 22 };
    frame.faceBox = { x: 0.35, y: 0.12, w: 0.3, h: 0.28 };
    const built = outlineFromMasks(Array.from({ length: 8 }, () => ({ width, height, values })), frame);
    expect(built.fallback).toBe(false);
    expect(built.silhouette?.points.length).toBeGreaterThanOrEqual(120);
    expect(built.silhouette?.points.length).toBeLessThanOrEqual(180);
  });

  it('falls back when the head spike is not over the shoulders', () => {
    const width = 80;
    const height = 60;
    const values = new Float32Array(width * height);
    fill(values, width, 20, 60, 28, 48);
    fill(values, width, 18, 24, 4, 30);
    const frame = pose();
    const built = outlineFromMasks([{ width, height, values }], frame);
    expect(built.fallback).toBe(true);
    expect(built.silhouette).toBeNull();
  });

  it('averages several masks and chooses the person channel', () => {
    const first = new Float32Array([0, 1, 0, 1]);
    const second = new Float32Array([1, 0, 1, 0]);
    const mean = averageMasks(
      [
        { width: 2, height: 2, values: first },
        { width: 2, height: 2, values: second },
      ],
      12,
    );
    expect(mean?.values[0]).toBeCloseTo(0.5);
    const chosen = choosePersonValues([first, second], 2, 2, [{ x: 1, y: 0 }]);
    expect(chosen[1]).toBe(1);
  });
});

function fill(values: Float32Array, width: number, x0: number, x1: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) values[y * width + x] = 1;
  }
}

function person(headX: number, headY: number): Point[] {
  return [
    { x: headX, y: headY },
    { x: -40, y: -20 },
    { x: -50, y: 0 },
    { x: -50, y: 40 },
    { x: 50, y: 40 },
    { x: 50, y: 0 },
    { x: 40, y: -20 },
    { x: headX, y: headY + 10 },
  ];
}

function pose(): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 80,
    videoHeight: 60,
    nose: { x: 21, y: 10 },
    leftShoulder: { x: 28, y: 36 },
    rightShoulder: { x: 52, y: 36 },
  };
}
