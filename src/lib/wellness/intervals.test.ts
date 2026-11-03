import { describe, expect, it } from 'vitest';
import { wellnessConfig } from './config';
import { initialInterval, skipInterval, snoozeInterval, stepInterval, stepReminder, type IntervalDurations, type IntervalState } from './intervals';
import { stoodSummary } from './format';

const durations: IntervalDurations = { sitMs: 20 * 60_000, standMs: 8 * 60_000, moveMs: 2 * 60_000 };

function tick(
  state: ReturnType<typeof initialInterval>,
  dtMs: number,
  detected: 'sitting' | 'standing' | 'away' = 'sitting',
  extra: { busy?: boolean; noDesk?: boolean; speed?: number; durations?: IntervalDurations } = {},
) {
  return stepInterval(state, {
    dtMs,
    detected,
    busy: extra.busy ?? false,
    noDesk: extra.noDesk ?? false,
    durations: extra.durations ?? durations,
    speed: extra.speed,
  });
}

describe('sit-stand intervals', () => {
  it('asks you to stand when the sit block ends', () => {
    const next = tick(initialInterval(durations), durations.sitMs);
    expect(next.phase).toBe('sit');
    expect(next.nudge).toBe('stand');
    expect(next.due).toBe(true);
  });

  it('starts the stand block as soon as you stand', () => {
    const midway = tick(initialInterval(durations), 60_000);
    const stood = tick(midway, 1000, 'standing');
    expect(stood.phase).toBe('stand');
    expect(stood.remainingMs).toBe(durations.standMs);
    expect(stood.switches).toBe(1);
    expect(stood.nudge).toBeNull();
  });

  it('opens a move break after standing when the preset includes one', () => {
    let state: IntervalState = { ...initialInterval(durations), phase: 'stand', remainingMs: durations.standMs };
    state = tick(state, durations.standMs, 'standing');
    expect(state.phase).toBe('move');
    expect(state.nudge).toBe('move');
  });

  it('swaps the stand block for a move break without a standing desk', () => {
    const next = tick(initialInterval(durations), durations.sitMs, 'sitting', { noDesk: true });
    expect(next.phase).toBe('move');
    expect(next.nudge).toBe('move');
  });

  it('pauses while you are away', () => {
    const started = tick(initialInterval(durations), 60_000);
    const away = tick(started, 5 * 60_000, 'away');
    expect(away.remainingMs).toBe(started.remainingMs);
  });

  it('snoozes the prompt and can skip to the next block', () => {
    const due = tick(initialInterval(durations), durations.sitMs);
    const snoozed = tick(snoozeInterval(due), 60_000);
    expect(snoozed.nudge).toBeNull();
    const skipped = skipInterval(due, durations, false);
    expect(skipped.phase).toBe('stand');
    expect(skipped.switches).toBe(0);
  });

  it('waits through a busy spell, then reminds once more', () => {
    const due = tick(initialInterval(durations), durations.sitMs);
    const delayed = tick(due, wellnessConfig.busyDelayMs, 'sitting', { busy: true });
    expect(delayed.nudge).toBeNull();
    const shown = tick(delayed, 1000);
    expect(shown.nudge).toBe('stand');
    const again = tick(shown, wellnessConfig.renudgeMs);
    expect(again.renudged).toBe(true);
    expect(again.nudge).toBe('stand');
  });

  it('runs the clock faster when the dev speed is on', () => {
    const next = tick(initialInterval(durations), 1000, 'sitting', { speed: wellnessConfig.devSpeed });
    expect(durations.sitMs - next.remainingMs).toBe(10_000);
  });
});

describe('wellness reminders', () => {
  it('fires an eye rest on its interval and summarizes standing time', () => {
    expect(stepReminder(19 * 60_000, 20 * 60_000, true, 60_000).fired).toBe(true);
    expect(stepReminder(0, 20 * 60_000, false, 60_000).fired).toBe(false);
    expect(stoodSummary(130 * 60_000)).toBe('You stood 2h 10m this week');
  });
});
