import { describe, expect, it } from 'vitest';
import type { MinuteRecord } from '../progress/aggregate';
import { dayTimeline, feelGood, greeting, posturePill, printIsStale, slouchTone, todayLine } from './liveHome';

const zone = 'America/Chicago';

describe('home live copy', () => {
  it('greets with a name only when one is saved', () => {
    expect(greeting(9, 'Alok')).toBe('Good morning, Alok');
    expect(greeting(14, '  ')).toBe('Good afternoon');
    expect(greeting(19, '')).toBe('Good evening');
  });

  it('builds the feel-good line from real numbers only', () => {
    expect(feelGood({ todayTall: null, yesterdayTall: null, breaks: 0, streak: 0 })).toBe("Fresh start today. Let's go!");
    expect(feelGood({ todayTall: 70, yesterdayTall: 52, breaks: 0, streak: 0 })).toBe('You sat tall 18% more than yesterday. Nice!');
    expect(feelGood({ todayTall: 40, yesterdayTall: 70, breaks: 3, streak: 6 })).toBe('3 breaks already, great rhythm');
    expect(feelGood({ todayTall: null, yesterdayTall: null, breaks: 0, streak: 6 })).toBe('6-day streak!');
  });

  it('colors less slouch as good', () => {
    expect(slouchTone(10, 18)).toBe('good');
    expect(slouchTone(20, 18)).toBe('bad');
    expect(slouchTone(null, 18)).toBe('flat');
    expect(todayLine(82, 76)).toBe('Today 82, +6 vs yesterday');
    expect(todayLine(null, 76)).toBe('Starts today');
  });

  it('marks a print older than 14 days', () => {
    const now = Date.parse('2026-10-26T15:00:00Z');
    expect(printIsStale('2026-10-01T15:00:00Z', now)).toBe(true);
    expect(printIsStale('2026-10-20T15:00:00Z', now)).toBe(false);
  });

  it('picks the status pill from the slouch amount', () => {
    expect(posturePill(0.2)?.text).toBe('Sitting tall, matches your Posture Print');
    expect(posturePill(1.4)?.tone).toBe('drift');
    expect(posturePill(3)?.tone).toBe('slouch');
    expect(posturePill(null)).toBeNull();
  });

  it('colors past hours and leaves the future empty', () => {
    const now = Date.parse('2026-10-26T15:30:00Z');
    const minutes: MinuteRecord[] = [
      { minute: Math.floor(Date.parse('2026-10-26T14:10:00Z') / 60_000), score: 90, state: 'great' },
      { minute: Math.floor(Date.parse('2026-10-26T15:10:00Z') / 60_000), score: 50, state: 'slouch' },
    ];
    const slots = dayTimeline(minutes, now, zone);
    const nine = slots.find((slot) => slot.hour === 9);
    const ten = slots.find((slot) => slot.hour === 10);
    const nowSlot = slots.find((slot) => slot.now);
    expect(nine?.state).toBe('great');
    expect(ten?.state).toBe('slouch');
    expect(nowSlot?.hour).toBe(10);
    expect(slots.find((slot) => slot.hour === 11)?.state).toBe('empty');
  });
});
