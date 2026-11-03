import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../settings/defaults';
import { allReminderKinds, emptyHolds, holdsForDay, isHeld, markDone, resumeAll, snoozeAll, snoozeKind } from './holds';
import { planDay, reminderName } from './plan';
import { snapTo } from './config';

const base = { ...defaultSettings, water: true, eyeRest: true, spotEveryMin: 15 as const };
const at = (hour: number, minute = 0) => new Date(2026, 10, 3, hour, minute).getTime();

describe('day plan', () => {
  it('places reminders inside work hours only', () => {
    const dots = planDay({ ...base, workStart: '10:00', workEnd: '16:00' }, 8 * 60);
    expect(dots[0]!.minute).toBeGreaterThanOrEqual(10 * 60);
    expect(dots.at(-1)!.minute).toBeLessThanOrEqual(16 * 60);
  });

  it('skips quiet hours', () => {
    const dots = planDay({ ...base, workEnd: '22:00', quietHours: true, quietStart: '20:00', quietEnd: '07:00' }, 9 * 60);
    expect(dots.some((dot) => dot.minute >= 20 * 60)).toBe(false);
  });

  it('lets move breaks and spot checks be turned off', () => {
    const dots = planDay({ ...base, moveBreaks: false, spotChecks: false }, 9 * 60);
    expect(dots.some((dot) => dot.kind === 'move' || dot.kind === 'spot')).toBe(false);
  });

  it('leaves spot checks out unless the camera mode is Spot check', () => {
    expect(planDay({ ...base, cameraMode: 'always' }, 9 * 60).some((dot) => dot.kind === 'spot')).toBe(false);
    expect(planDay({ ...base, cameraMode: 'spot' }, 9 * 60).some((dot) => dot.kind === 'spot')).toBe(true);
  });

  it('follows the live sitting timer for the next move break', () => {
    const dots = planDay({ ...base, water: false, eyeRest: false, spotChecks: false }, 13 * 60, { moveDueMin: 13 * 60 + 18 });
    expect(dots[0]).toMatchObject({ kind: 'move', minute: 13 * 60 + 18, label: 'Move break' });
    expect(dots[1]!.minute).toBe(13 * 60 + 18 + 45);
  });

  it('counts the next one from Done', () => {
    const holds = holdsForDay(markDone(emptyHolds, 'water', at(9, 50)), at(9, 51));
    const dots = planDay({ ...base, moveBreaks: false, eyeRest: false, spotChecks: false }, 9 * 60 + 51, { holds });
    expect(dots[0]!.minute).toBe(10 * 60 + 50);
  });

  it('names each type', () => {
    expect(reminderName('eye')).toBe('Eye break');
    expect(reminderName('spot')).toBe('Spot check');
  });
});

describe('snoozes', () => {
  it('Snooze all holds every reminder type', () => {
    const holds = snoozeAll(emptyHolds, at(13), 30);
    for (const kind of allReminderKinds) {
      expect(isHeld(holds, kind, at(13, 10))).toBe(true);
      expect(isHeld(holds, kind, at(13, 31))).toBe(false);
    }
    expect(isHeld(resumeAll(holds), 'water', at(13, 10))).toBe(false);
  });

  it('Snooze all pushes every type in the plan past the snooze', () => {
    const now = 13 * 60;
    const live = { moveDueMin: now + 5, spotDueMin: now + 2 };
    const before = planDay(base, now, live);
    expect(before[0]!.minute).toBeLessThan(now + 30);
    const holds = holdsForDay(snoozeAll(emptyHolds, at(13), 30), at(13));
    const after = planDay(base, now, { ...live, holds });
    expect(after.every((dot) => dot.minute >= now + 30)).toBe(true);
    for (const kind of ['move', 'water', 'eye', 'spot'] as const) {
      expect(after.some((dot) => dot.kind === kind && dot.minute === now + 30)).toBe(true);
    }
  });

  it('Snooze 10 min moves just that type', () => {
    const now = 13 * 60;
    const holds = holdsForDay(snoozeKind(emptyHolds, 'move', at(13), 10), at(13));
    const dots = planDay(base, now, { moveDueMin: now, spotDueMin: now + 2, holds });
    expect(dots.find((dot) => dot.kind === 'move')!.minute).toBe(now + 10);
    expect(dots.find((dot) => dot.kind === 'spot')!.minute).toBe(now + 2);
  });
});

describe('interval options', () => {
  it('snaps old values to the shared options', () => {
    expect(snapTo(50, [30, 45, 60, 90])).toBe(45);
    expect(snapTo(1, [45, 60, 90, 120])).toBe(45);
    expect(snapTo(75, [45, 60, 90, 120])).toBe(60);
  });
});
