import { describe, expect, it } from 'vitest';
import { sidebarStatus, upcomingReminder, type ReminderSettings, type StatusInput } from './sidebarStatus';

const base: StatusInput = { print: 'zen', live: true, match: 92, drifting: false, mode: 'sit' };
const reminders: ReminderSettings = {
  water: false,
  waterMinutes: 60,
  breakMinutes: 30,
  eyeRest: false,
  eyeRestMinutes: 20,
  spotEveryMin: 0,
  quietHours: false,
  quietStart: '22:00',
  quietEnd: '07:00',
};

describe('sidebar status', () => {
  it('waits while the print loads', () => {
    expect(sidebarStatus({ ...base, print: 'loading' })).toBeNull();
  });

  it('shows a calm Set my Zen state when there is no print', () => {
    expect(sidebarStatus({ ...base, print: 'none', match: null })).toEqual({
      ring: null,
      title: 'Set my Zen to start',
      detail: 'Save your Posture Print',
      tone: 'calm',
      setZen: true,
    });
  });

  it('asks to set Zen again for an old print', () => {
    const status = sidebarStatus({ ...base, print: 'old' });
    expect(status?.title).toBe('Set your Zen again');
    expect(status?.setZen).toBe(true);
    expect(status?.ring).toBeNull();
  });

  it('stays calm with the camera off or nobody in view', () => {
    expect(sidebarStatus({ ...base, live: false, match: null })).toMatchObject({ ring: null, title: 'Zen set', detail: 'Sitting \u00b7 Camera off', setZen: false });
    expect(sidebarStatus({ ...base, match: null })).toMatchObject({ ring: null, title: 'Looking for you', tone: 'calm' });
  });

  it('shows the live match and on track or drifting', () => {
    expect(sidebarStatus(base)).toMatchObject({ ring: 92, title: 'On track', detail: 'Sitting \u00b7 Zen set', tone: 'good' });
    expect(sidebarStatus({ ...base, match: 70, drifting: true, mode: 'stand' })).toMatchObject({ ring: 70, title: 'Drifting', detail: 'Standing \u00b7 Zen set', tone: 'drift' });
  });
});

describe('sidebar next reminder', () => {
  it('names the next reminder and how far away it is', () => {
    expect(upcomingReminder(reminders, 10 * 60 + 12)).toEqual({ name: 'Move break', when: '18 min' });
    expect(upcomingReminder(reminders, 10 * 60 + 30)).toEqual({ name: 'Move break', when: 'now' });
  });

  it('shows a clock time when it is an hour or more away', () => {
    expect(upcomingReminder({ ...reminders, breakMinutes: 120 }, 9 * 60 + 30)).toEqual({ name: 'Move break', when: '11:00 AM' });
  });

  it('hides when the day is done or it is quiet time', () => {
    expect(upcomingReminder(reminders, 19 * 60)).toBeNull();
    expect(upcomingReminder({ ...reminders, quietHours: true, quietStart: '10:00', quietEnd: '11:00' }, 10 * 60 + 15)).toBeNull();
  });
});
