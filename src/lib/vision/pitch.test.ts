import { describe, expect, it } from 'vitest';
import { pitchDegFromMatrix, yawDegFromMatrix } from './pitch';

describe('pitch from the face matrix', () => {
  it('reads 0 from identity and 25 degrees from an x rotation', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    expect(pitchDegFromMatrix(identity)).toBeCloseTo(0);

    const radians = (25 * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const turned = [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1];
    expect(pitchDegFromMatrix(turned)).toBeCloseTo(25);
    expect(pitchDegFromMatrix(undefined)).toBeUndefined();
  });

  it('reads yaw without calling it pitch', () => {
    const radians = (30 * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const turned = [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1];
    expect(yawDegFromMatrix(turned)).toBeCloseTo(30);
    expect(pitchDegFromMatrix(turned)).toBeCloseTo(0);
    expect(yawDegFromMatrix(undefined)).toBeUndefined();
  });
});
