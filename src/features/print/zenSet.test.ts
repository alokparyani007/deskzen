import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';
import { landmarkBodyPoints } from './landmarkBody';
import { mirroredFit } from './outlineFit';
import { outlineAccuracyLabel, shownOutlineAccuracy } from './zenSet';

describe('zen set', () => {
  it('names outline accuracy from the quality score', () => {
    expect(outlineAccuracyLabel(85)).toBe('Great');
    expect(outlineAccuracyLabel(92)).toBe('Great');
    expect(outlineAccuracyLabel(70)).toBe('Good');
    expect(outlineAccuracyLabel(84)).toBe('Good');
    expect(outlineAccuracyLabel(69)).toBe('Fair');
    expect(outlineAccuracyLabel(Number.NaN)).toBe('Fair');
    expect(shownOutlineAccuracy(92, true)).toBe('Good');
    expect(shownOutlineAccuracy(92, false)).toBe('Great');
  });

  it('builds a desk-cut body from landmarks', () => {
    const frame: Landmarks = {
      timestampMs: 1,
      faceCount: 1,
      videoWidth: 640,
      videoHeight: 480,
      nose: { x: 320, y: 140 },
      leftEye: { x: 300, y: 130 },
      rightEye: { x: 340, y: 130 },
      leftShoulder: { x: 250, y: 260 },
      rightShoulder: { x: 390, y: 260 },
      leftElbow: { x: 210, y: 340 },
      rightElbow: { x: 430, y: 340 },
    };
    const points = landmarkBodyPoints(frame);
    expect(points).not.toBeNull();
    expect((points ?? []).length).toBeGreaterThan(8);
    const bottom = Math.max(...(points ?? []).map((point) => point.y));
    expect(points?.filter((point) => point.y === bottom).length).toBeGreaterThanOrEqual(2);
    expect(mirroredFit(points ?? [])?.viewBox.split(' ').length).toBe(4);
  });
});