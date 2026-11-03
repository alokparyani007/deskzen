import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { planDay } from '../../lib/reminders/plan';
import { defaultSettings, type AppSettings } from '../../lib/settings/defaults';
import { RemindersView, type RemindersViewProps } from './RemindersView';
import { centerCopy } from './DayDial';

const clockMs = new Date(2026, 10, 3, 12, 52).getTime();
const settings: AppSettings = { ...defaultSettings, water: true, eyeRest: true, quietHours: true, quietStart: '21:00', quietEnd: '07:00' };

function render(props: Partial<RemindersViewProps> = {}): string {
  const full: RemindersViewProps = {
    clockMs,
    dots: planDay(settings, 12 * 60 + 52, { moveDueMin: 13 * 60 + 10 }),
    settings,
    snoozedUntilMs: null,
    focusEndsAt: null,
    message: null,
    onUpdate: () => {},
    onDone: () => {},
    onSnooze: () => {},
    onSnoozeAll: () => {},
    onResume: () => {},
    onStartFocus: () => {},
    onToggleVoice: () => {},
    ...props,
  };
  return renderToString(createElement(MemoryRouter, null, createElement(RemindersView, full))).replace(/<!-- -->/g, '');
}

describe('reminders page', () => {
  it('renders the dial, today list and cards', () => {
    const html = render();
    expect(html).toContain('Reminders');
    expect(html).toContain('Snooze all 30 min');
    expect(html).toContain('Next up');
    expect(html).toContain('Quiet hours');
    expect(html).toContain('Today');
    expect(html).toContain('Posture nudges');
    expect(html).toContain('Move breaks');
    expect(html).toContain('Eye breaks');
    expect(html).toContain('Spot check');
    expect(html).toContain('Voice tips are on');
    expect(html).toContain('role="switch"');
    expect(html).not.toContain('Sit and stand');
  });

  it('hides the spot check card when the camera mode is not Spot check', () => {
    const html = render({ settings: { ...settings, cameraMode: 'always' }, dots: [] });
    expect(html).not.toContain('>Spot check<');
  });

  it('shows the sit-and-stand card and opens an editor', () => {
    const html = render({ settings: { ...settings, workStyle: 'mixed', intervalsOn: true }, initialEditor: 'sitstand' });
    expect(html).toContain('Sit and stand');
    expect(html).toContain('Easy start 45-15');
  });

  it('opens the schedule editor with work and quiet hours', () => {
    const html = render({ initialEditor: 'schedule' });
    expect(html).toContain('Work hours');
    expect(html).toContain('type="time"');
  });

  it('shows the snoozed state', () => {
    const html = render({ snoozedUntilMs: clockMs + 30 * 60_000 });
    expect(html).toContain('Snoozed until 1:22 PM');
    expect(html).toContain('All reminders');
  });

  it('renders an all-clear day', () => {
    const html = render({ dots: [] });
    expect(html).toContain('All clear');
  });

  it('counts down with seconds in the last 10 minutes', () => {
    const next = { kind: 'move' as const, minute: 13 * 60 + 10, label: 'Move break' };
    expect(centerCopy(next, (12 * 60 + 52) * 60, null, clockMs).detail).toBe('in 18 min');
    expect(centerCopy(next, (13 * 60 + 5) * 60 + 18, null, clockMs).detail).toBe('in 4:42');
  });
});
