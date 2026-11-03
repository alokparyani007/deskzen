import { describe, expect, it } from 'vitest';
import { isGoodDay, type DayCounts, type MinuteRecord } from './aggregate';
import { habitStreak } from './dashboard';
import { bestHour, buildProgress, changeNote, dayClock, minutesLabel, mostSlouchHour, periodWindows, pickInsight, scoreHeadline, sitStandMinutes, streakFor } from './period';

const zone = 'America/Chicago';
const now = Date.parse('2026-11-03T12:00:00-06:00');
const clock = dayClock(zone);

/** count minutes from a local Chicago time ('2026-11-03T10:00'). */
function block(local: string, count: number, score: number, mode: 'sit' | 'stand' = 'sit'): MinuteRecord[] {
  const offset = local < '2026-11-01T02:00' ? '-05:00' : '-06:00';
  const start = Math.floor(Date.parse(`${local}:00${offset}`) / 60_000);
  return Array.from({ length: count }, (_, index) => ({ minute: start + index, score, mode }));
}

const base = { counts: [] as DayCounts[], timeZone: zone, nowMs: now, name: '' };

describe('period windows', () => {
  it('splits this week and last week into local days', () => {
    const windows = periodWindows(now, zone, 'week');
    expect(windows.current).toHaveLength(7);
    expect(windows.previous).toHaveLength(7);
    expect(windows.current.at(-1)).toBe('2026-11-03');
    expect(windows.current[0]).toBe('2026-10-28');
    expect(windows.previous[0]).toBe('2026-10-21');
    expect(periodWindows(now, zone, 'today')).toEqual({ current: ['2026-11-03'], previous: ['2026-11-02'] });
  });
});

describe('best and most-slouch hour', () => {
  it('picks the hour with the highest average, ignoring thin hours', () => {
    const rows = [...block('2026-11-03T09:00', 15, 70), ...block('2026-11-03T10:00', 15, 92), ...block('2026-11-03T11:00', 5, 99)];
    expect(bestHour(rows, clock)).toEqual({ hour: 10, average: 92 });
    expect(bestHour(block('2026-11-03T09:00', 5, 90), clock)).toBeNull();
  });

  it('finds the hour with the most slouch minutes', () => {
    const rows = [...block('2026-11-03T09:00', 5, 50), ...block('2026-11-03T14:00', 12, 55), ...block('2026-11-03T15:00', 30, 90)];
    expect(mostSlouchHour(rows, clock)).toBe(14);
    expect(mostSlouchHour(block('2026-11-03T15:00', 30, 90), clock)).toBeNull();
  });
});

describe('sitting and standing time', () => {
  it('counts minutes by their recorded mode', () => {
    const rows = [...block('2026-11-03T09:00', 40, 80, 'sit'), ...block('2026-11-03T10:00', 15, 80, 'stand')];
    expect(sitStandMinutes(rows)).toEqual({ sit: 40, stand: 15 });
    expect(sitStandMinutes([{ minute: 1, score: 80 }])).toEqual({ sit: 1, stand: 0 });
  });
});

describe('period deltas', () => {
  const lastWeek = [...block('2026-10-22T10:00', 60, 88), ...block('2026-10-23T10:00', 60, 68)];
  const thisWeek = [...block('2026-11-02T10:00', 60, 90), ...block('2026-11-03T09:00', 60, 78)];

  it('says up, down, same, or first, and never alarms on a drop', () => {
    expect(buildProgress({ ...base, minutes: [...lastWeek, ...thisWeek], period: 'week' }).headline.title).toBe('Up 6 from last week');
    expect(scoreHeadline(75, 78, 'week')).toMatchObject({ title: 'Down 3 from last week', tone: 'down' });
    expect(scoreHeadline(75, 78, 'week').note).toBe('Small dips are normal. A short break can help you reset.');
    expect(scoreHeadline(80, 80.2, 'month').title).toBe('Same as last month');
    expect(scoreHeadline(84, null, 'week').title).toBe('First week, nice start');
    expect(scoreHeadline(84, 80, 'today').title).toBe('Up 4 from yesterday');
  });

  it('shows the score and last period score', () => {
    const model = buildProgress({ ...base, minutes: [...lastWeek, ...thisWeek], period: 'week' });
    expect(model.score).toBe(84);
    expect(model.previousScore).toBe(78);
    expect(model.tiles.sitting.value).toBe('1h 0m');
    expect(model.tiles.slouch.note).toEqual({ text: '1h 0m less than last week', tone: 'good' });
  });

  it('treats less slouch as good and less sitting well as calm', () => {
    expect(changeNote(38, 60, 'last week', { format: minutesLabel, lowerIsBetter: true })).toEqual({ text: '22 min less than last week', tone: 'good' });
    expect(changeNote(70, 60, 'last week', { format: minutesLabel, lowerIsBetter: true })).toEqual({ text: '10 min more than last week', tone: 'calm' });
    expect(changeNote(680, 575, 'last week', { format: minutesLabel })).toEqual({ text: '+1h 45m vs last week', tone: 'good' });
    expect(changeNote(500, 575, 'last week', { format: minutesLabel }).tone).toBe('calm');
    expect(changeNote(5, null, 'yesterday', { format: minutesLabel }).text).toBe('No data from yesterday yet');
  });

  it('uses real last-period breaks and water, not zero', () => {
    const counts: DayCounts[] = [
      { date: '2026-11-02', breaks: 5, water: 6 },
      { date: '2026-11-03', breaks: 4, water: 7 },
      { date: '2026-10-22', breaks: 3, water: 5 },
      { date: '2026-10-23', breaks: 4, water: 5 },
    ];
    const model = buildProgress({ ...base, counts, minutes: [...lastWeek, ...thisWeek], period: 'week' });
    expect(model.tiles.breaks.value).toBe('4.5');
    expect(model.tiles.breaks.note).toEqual({ text: '+1 vs last week', tone: 'good' });
    const water = model.habits.find((habit) => habit.label === 'Water');
    expect(water?.value).toBe('6.5 glasses a day');
    expect(water?.note.text).toBe('+1.5 vs last week');
  });

  it('shows stand-up taps as times, not minutes', () => {
    const counts: DayCounts[] = [{ date: '2026-11-03', breaks: 0, water: 0, standingMinutes: 3 }];
    const model = buildProgress({ ...base, counts, minutes: thisWeek, period: 'today' });
    expect(model.habits.find((habit) => habit.label === 'Stood up')?.value).toBe('3 times');
  });

  it('compares today with yesterday by hour', () => {
    const model = buildProgress({ ...base, minutes: [...block('2026-11-02T10:00', 30, 70), ...block('2026-11-03T10:00', 30, 90)], period: 'today' });
    expect(model.names.previous).toBe('yesterday');
    expect(model.points.find((point) => point.key === '10')).toMatchObject({ label: '10 AM', current: 90, previous: 70 });
  });
});

describe('unified streak', () => {
  it('uses one good-day rule: 30+ minutes averaging 75+', () => {
    expect(isGoodDay(75, 30)).toBe(true);
    expect(isGoodDay(74.9, 30)).toBe(false);
    expect(isGoodDay(90, 29)).toBe(false);
    expect(isGoodDay(null, 0)).toBe(false);
  });

  it('gives Home and Progress the same current streak', () => {
    const minutes = [
      ...block('2026-10-30T10:00', 40, 72),
      ...block('2026-10-31T10:00', 40, 80),
      ...block('2026-11-01T10:00', 40, 78),
      ...block('2026-11-02T10:00', 40, 76),
    ];
    const streak = streakFor(minutes, now, zone, clock);
    expect(streak).toEqual({ current: 3, best: 3 });
    expect(habitStreak(minutes, now, zone)).toBe(3);
  });
});

describe('insight', () => {
  it('rotates through true lines and adds the first name', () => {
    expect(pickInsight(['A.', 'B.'], 3, 'Maya Lopez')).toBe('B. Nice work, Maya!');
    expect(pickInsight(['A.'], 0, '')).toBe('A. Nice work!');
    expect(pickInsight([], 0, 'Maya')).toBeNull();
  });

  it('only claims sitting tall more often when it is true', () => {
    const lastWeek = block('2026-10-22T10:00', 60, 70);
    const better = buildProgress({ ...base, name: 'Maya', minutes: [...lastWeek, ...block('2026-11-03T08:00', 60, 90)], period: 'week' });
    const worse = buildProgress({ ...base, minutes: [...block('2026-10-22T10:00', 60, 90), ...block('2026-11-03T08:00', 60, 70)], period: 'week' });
    expect(better.insight).toMatch(/Nice work, Maya!$/);
    expect(worse.insight ?? '').not.toContain('sat tall more often');
  });
});
