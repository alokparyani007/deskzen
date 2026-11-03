import { describe, expect, it } from 'vitest';
import { screenPath, toScreen } from './toScreen';

describe('toScreen', () => {
  it('mirrors x when the frame matches the video', () => {
    expect(toScreen(0, 10, 100, 50, 100, 50)).toEqual({ x: 1, y: 0.2 });
    expect(toScreen(100, 0, 100, 50, 100, 50)).toEqual({ x: 0, y: 0 });
    expect(toScreen(25, 25, 100, 50, 200, 100).x).toBeCloseTo(0.75);
  });

  it('crops like object-cover before mirroring', () => {
    const center = toScreen(50, 50, 100, 100, 100, 50);
    expect(center.x).toBeCloseTo(0.5);
    expect(center.y).toBeCloseTo(0.5);
    expect(toScreen(50, 0, 100, 100, 100, 50).y).toBeLessThan(0);
  });

  it('builds a closed path', () => {
    const path = screenPath(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      10,
      10,
      10,
      10,
    );
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });
});
