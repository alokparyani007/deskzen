import { describe, expect, it } from 'vitest';
import { routineDuration, routines, stretches } from './data';

describe('stretch routines', () => {
  it('keeps each routine between 1 and 3 minutes', () => {
    for (const routine of routines) {
      const seconds = routineDuration(routine);
      expect(seconds).toBeGreaterThanOrEqual(60);
      expect(seconds).toBeLessThanOrEqual(180);
    }
  });

  it('defines at least 12 stretches across the six categories', () => {
    expect(stretches.length).toBeGreaterThanOrEqual(12);
    expect(new Set(stretches.map((item) => item.category)).size).toBe(6);
    for (const item of stretches) {
      expect(item.steps.length).toBeGreaterThanOrEqual(3);
      expect(item.steps.length).toBeLessThanOrEqual(5);
      expect(item.note.toLowerCase()).not.toMatch(/cure|treat|diagnos/);
    }
  });
});
