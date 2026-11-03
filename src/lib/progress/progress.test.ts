import { describe, expect, it } from 'vitest';
import { aggregateDays, localDayKey, streakStats, type MinuteRecord } from './aggregate';
import { seedMinutes } from './seed';

const zone = 'America/Chicago';

function minutesOn(isoUtc: string, count: number, score: number): MinuteRecord[] {
  const start = Math.floor(Date.parse(isoUtc) / 60_000);
  return Array.from({ length: count }, (_, index) => ({ minute: start + index, score }));
}

describe('local days', () => {
  it('keeps both sides of a daylight-saving jump on the same local day', () => {
    expect(localDayKey(Date.parse('2026-03-08T06:30:00.000Z'), 'America/New_York')).toBe('2026-03-08');
    expect(localDayKey(Date.parse('2026-03-08T07:30:00.000Z'), 'America/New_York')).toBe('2026-03-08');
    expect(localDayKey(Date.parse('2026-03-08T04:30:00.000Z'), 'America/New_York')).toBe('2026-03-07');
  });
});

describe('streaks', () => {
  it('breaks a streak on a gap day and ignores an unfinished today', () => {
    const now = Date.parse('2026-10-22T20:00:00.000Z');
    const minutes = [
      ...minutesOn('2026-10-17T18:00:00.000Z', 40, 88),
      ...minutesOn('2026-10-18T18:00:00.000Z', 40, 86),
      ...minutesOn('2026-10-19T18:00:00.000Z', 40, 84),
      ...minutesOn('2026-10-21T18:00:00.000Z', 40, 82),
      ...minutesOn('2026-10-22T18:00:00.000Z', 10, 90),
    ];
    const days = aggregateDays(minutes, [], now, zone, 8);
    const stats = streakStats(days);
    expect(stats.current).toBe(1);
    expect(stats.best).toBe(3);
    const today = days[days.length - 1];
    expect(today?.date).toBe('2026-10-22');
    expect(today?.counts).toBe(false);
    expect(today?.trackedMinutes).toBe(10);
  });

  it('counts a day only when the average and tracked minutes both qualify', () => {
    const now = Date.parse('2026-10-22T20:00:00.000Z');
    const minutes = minutesOn('2026-10-22T18:00:00.000Z', 40, 60);
    const today = aggregateDays(minutes, [], now, zone, 1)[0];
    expect(today?.counts).toBe(false);
    expect(today?.sittingWellMinutes).toBe(0);
  });
});

describe('sample history', () => {
  it('fills 14 local days and leaves one day under the streak line', () => {
    const now = Date.parse('2026-10-25T17:00:00.000Z');
    const records = seedMinutes(now, zone);
    const days = aggregateDays(records, [], now, zone, 14);
    expect(days).toHaveLength(14);
    expect(new Set(days.map((day) => day.date)).size).toBe(14);
    expect(days.some((day) => day.average !== null && day.average < 70)).toBe(true);
    expect(streakStats(days).best).toBeGreaterThan(1);
  });
});
