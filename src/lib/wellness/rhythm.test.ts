import { describe, expect, it } from 'vitest';
import { nextReminder, notificationAllowed, planDue, quietBlocks, reminderDots, snoozeMinute } from './rhythm';

describe('day rhythm', () => {
  it('picks the earliest reminder that is still ahead', () => {
    const settings = {
      water: true,
      waterMinutes: 60,
      breakMinutes: 45,
      eyeRest: true,
      eyeRestMinutes: 30,
      spotEveryMin: 60,
    };
    expect(nextReminder(settings, 9 * 60)?.kind).toBe('eye');
    expect(nextReminder(settings, 9 * 60 + 40)?.kind).toBe('move');
    expect(nextReminder({ ...settings, water: false, eyeRest: false }, 18 * 60 + 1)).toBeNull();
  });

  it('places water dots on the schedule', () => {
    const dots = reminderDots(9 * 60, 18 * 60, 45, 'water', 'Water');
    expect(dots[0]?.minute).toBe(9 * 60 + 45);
    expect(dots[0]?.label).toContain('Water');
    expect(dots.at(-1)!.minute).toBeLessThanOrEqual(18 * 60);
  });

  it('blocks reminders during quiet hours', () => {
    expect(quietBlocks(22 * 60, 21 * 60, 7 * 60, true)).toBe(true);
    expect(quietBlocks(10 * 60, 21 * 60, 7 * 60, true)).toBe(false);
    expect(quietBlocks(22 * 60, 21 * 60, 7 * 60, false)).toBe(false);
  });

  it('combines reminders that are due together', () => {
    expect(planDue([{ id: 'stretch', at: 10 }, { id: 'water', at: 12 }]).now).toEqual(['stretch', 'water']);
    expect(planDue([{ id: 'stretch', at: 10 }, { id: 'water', at: 20 }]).later).toEqual(['water']);
  });

  it('snoozes the next time', () => {
    expect(snoozeMinute(600, 10)).toBe(610);
  });

  it('notifies only when the tab is hidden and permission is granted', () => {
    expect(notificationAllowed('granted', true)).toBe(true);
    expect(notificationAllowed('granted', false)).toBe(false);
    expect(notificationAllowed('denied', true)).toBe(false);
  });
});
