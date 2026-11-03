import { describe, expect, it } from 'vitest';
import { migrateMinute, type MinuteRecord } from './aggregate';
import { actionItems, addGlass, alignDays, changeTone, compareRanges, habitStreak, stateShares, worstHour } from './dashboard';

function minute(minute: number, score: number, state?: MinuteRecord['state']): MinuteRecord {
  return { minute, score, state, mode: 'sit' };
}

describe('progress dashboard', () => {
  it('makes great, drift and slouch add up to 100%', () => {
    const shares = stateShares([minute(1, 90, 'great'), minute(2, 75, 'drift'), minute(3, 40, 'slouch'), minute(4, 90, 'great')]);
    expect(Math.round(shares.great + shares.drift + shares.slouch)).toBe(100);
  });

  it('counts a streak of days with 30 good minutes in the user timezone', () => {
    const zone = 'America/Chicago';
    const records: MinuteRecord[] = [];
    for (let day = 0; day < 3; day += 1) {
      const start = Date.parse('2026-10-20T15:00:00Z') + day * 86_400_000;
      for (let index = 0; index < 40; index += 1) records.push(minute(Math.floor(start / 60_000) + index, 80, 'great'));
    }
    expect(habitStreak(records, Date.parse('2026-10-22T18:00:00Z'), zone)).toBeGreaterThanOrEqual(2);
  });

  it('picks the hour with the most slouch', () => {
    const zone = 'UTC';
    const noon = Math.floor(Date.parse('2026-10-21T12:00:00Z') / 60_000);
    const morning = Math.floor(Date.parse('2026-10-21T08:00:00Z') / 60_000);
    const found = worstHour([minute(noon, 40, 'slouch'), minute(noon + 1, 40, 'slouch'), minute(morning, 40, 'slouch')], zone);
    expect(found?.hour).toBe(12);
  });

  it('compares the same weekday labels and the score change', () => {
    const labels = ['Mon', 'Tue', 'Wed'];
    expect(alignDays(labels.map((label) => ({ key: label, label, current: 80, previous: 70 })), labels)).toBe(true);
    expect(compareRanges([80, 90], [70, 80])).toBe(10);
  });

  it('colors less slouch time as good and less water as bad', () => {
    expect(changeTone('slouch', -12)).toBe('good');
    expect(changeTone('water', -1)).toBe('bad');
  });

  it('builds action items from the data and auto-ticks water when the goal is met', () => {
    const open = actionItems({ spotOrLive: true, waterLeft: 3, slouchHour: 15, printOld: false, standingLeft: null, manual: {} });
    expect(open.find((item) => item.id === 'morning')?.done).toBe(true);
    expect(open.find((item) => item.id === 'water')?.done).toBe(false);
    const done = actionItems({ spotOrLive: false, waterLeft: 0, slouchHour: null, printOld: false, standingLeft: null, manual: {} });
    expect(done.find((item) => item.id === 'water')?.done).toBe(true);
    expect(done[done.length - 1]?.done).toBe(true);
  });

  it('logs a glass of water', () => {
    expect(addGlass([{ date: '2026-10-25', breaks: 0, water: 2 }], '2026-10-25')[0]?.water).toBe(3);
  });

  it('migrates old minutes that have no state or mode', () => {
    expect(migrateMinute({ minute: 1, score: 90 })).toEqual({ minute: 1, score: 90, state: 'great', mode: 'sit' });
    expect(migrateMinute({ minute: 1, score: 50 }).state).toBe('slouch');
  });
});
