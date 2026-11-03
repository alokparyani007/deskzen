import { describe, expect, it } from 'vitest';
import { arcPath, clusterMarks, minuteToAngle, pointAt } from './dial';
import { reminderDots } from '../wellness/rhythm';

describe('day dial math', () => {
  it('puts 12 AM at the bottom and 12 PM at the top, running clockwise', () => {
    expect(minuteToAngle(0)).toBe(180);
    expect(minuteToAngle(6 * 60)).toBe(270);
    expect(minuteToAngle(12 * 60)).toBe(0);
    expect(minuteToAngle(18 * 60)).toBe(90);
    expect(minuteToAngle(24 * 60)).toBe(180);
    expect(minuteToAngle(13 * 60)).toBeCloseTo(15);
  });

  it('turns times into points around the center', () => {
    expect(pointAt(12 * 60, 100, 180, 180)).toEqual({ x: 180, y: 80 });
    expect(pointAt(0, 100, 180, 180)).toEqual({ x: 180, y: 280 });
    expect(pointAt(6 * 60, 100, 180, 180)).toEqual({ x: 80, y: 180 });
    expect(pointAt(18 * 60, 100, 180, 180)).toEqual({ x: 280, y: 180 });
  });

  it('draws arcs clockwise and wraps quiet hours past midnight', () => {
    // 9 AM to 6 PM is 9 hours: under half the dial.
    expect(arcPath(9 * 60, 18 * 60, 100, 180, 180)).toContain(' 0 0 1 ');
    // 9 PM to 7 AM wraps through midnight: 10 hours, still the small arc.
    const quiet = arcPath(21 * 60, 7 * 60, 100, 180, 180);
    expect(quiet).toContain(' 0 0 1 ');
    expect(quiet.startsWith('M 250.71 250.71')).toBe(true);
    // 6 AM to 8 PM is 14 hours: the large arc flag is set.
    expect(arcPath(6 * 60, 20 * 60, 100, 180, 180)).toContain(' 0 1 1 ');
  });
});

describe('dial clustering', () => {
  it('keeps the next 2 hours as single dots and thins the rest', () => {
    const now = 9 * 60;
    const spot = reminderDots(now, 18 * 60, 5, 'spot', 'Spot check');
    expect(spot.length).toBe(108);
    const marks = clusterMarks(spot, now);
    // 2 hours of checks every 5 min merge into 15-min dots, then one dot per hour.
    expect(marks.length).toBeLessThanOrEqual(16);
    expect(marks.reduce((sum, mark) => sum + mark.count, 0)).toBe(spot.length);
    expect(marks.filter((mark) => mark.minute >= now + 120).every((mark) => !mark.solo)).toBe(true);
  });

  it('shows sparse reminders one by one', () => {
    const dots = [
      { kind: 'water' as const, minute: 600, label: 'Water' },
      { kind: 'eye' as const, minute: 640, label: 'Eye break' },
    ];
    const marks = clusterMarks(dots, 590);
    expect(marks).toHaveLength(2);
    expect(marks.every((mark) => mark.solo && mark.count === 1)).toBe(true);
    expect(marks[0]!.label).toBe('Water at 10:00 AM');
  });

  it('merges reminders that land close together', () => {
    const dots = [
      { kind: 'move' as const, minute: 600, label: 'Move break' },
      { kind: 'spot' as const, minute: 605, label: 'Spot check' },
    ];
    const marks = clusterMarks(dots, 590);
    expect(marks).toHaveLength(1);
    expect(marks[0]!.count).toBe(2);
    expect(marks[0]!.kinds).toEqual(['move', 'spot']);
  });
});
