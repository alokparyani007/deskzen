import { describe, expect, it } from 'vitest';
import { classifyCameraError, stopCameraTracks, withCamera, type TrackedStream } from './camera';
import { dailySummary, repeatedIssue, type SpotRecord } from './history';
import {
  finishSpot,
  initialSpotSchedule,
  isQuietWindow,
  isWorkDay,
  noteCameraBusy,
  skipSpot,
  stepSpotSchedule,
  type SpotSchedule,
  type SpotTick,
} from './schedule';
import { alertPlan, spotAlertCopy, verdictFromFrames, type SpotFrame } from './verdict';

const every = 15 * 60_000;

function tick(nowMs: number, patch: Partial<SpotTick> = {}): SpotTick {
  return { nowMs, everyMs: every, quiet: false, workDay: true, focusActive: false, skipFocus: true, hidden: false, ...patch };
}

function frame(score: number, issue: SpotFrame['issue'], present = true): SpotFrame {
  return { present, score, issue };
}

describe('spot scheduler', () => {
  it('fires once when a throttled timer wakes up late', () => {
    const start = initialSpotSchedule(0, every);
    const late = stepSpotSchedule({ ...start, nextDueMs: 1_000 }, tick(46 * 60_000));
    expect(late.action).toBe('fire');
    expect(late.state.nextDueMs).toBe(46 * 60_000 + every);
    const again = stepSpotSchedule(late.state, tick(46 * 60_000 + 1_000));
    expect(again.action).toBe('wait');
  });

  it('shows a 3 second countdown, then one check', () => {
    const due = 10_000;
    const state: SpotSchedule = { ...initialSpotSchedule(0, every), nextDueMs: due };
    const soon = stepSpotSchedule(state, tick(due - 2_500));
    expect(soon.action).toBe('countdown');
    expect(soon.countdownSec).toBe(3);
    const fired = stepSpotSchedule(soon.state, tick(due));
    expect(fired.action).toBe('fire');
    expect(stepSpotSchedule(fired.state, tick(due + 100)).action).toBe('wait');
  });

  it('skips quiet hours, days off, and focus', () => {
    const due: SpotSchedule = { ...initialSpotSchedule(0, every), nextDueMs: 1_000 };
    expect(stepSpotSchedule(due, tick(5_000, { quiet: true })).action).toBe('quiet');
    expect(stepSpotSchedule(due, tick(5_000, { workDay: false })).action).toBe('offday');
    const focused = stepSpotSchedule(due, tick(5_000, { focusActive: true, skipFocus: true }));
    expect(focused.action).toBe('focus');
    expect(focused.state.nextDueMs).toBeGreaterThan(5_000);
    expect(isQuietWindow('18:00', '08:00', new Date(2026, 9, 25, 19, 0))).toBe(true);
    expect(isQuietWindow('18:00', '08:00', new Date(2026, 9, 25, 7, 30))).toBe(true);
    expect(isQuietWindow('18:00', '08:00', new Date(2026, 9, 25, 12, 0))).toBe(false);
    expect(isWorkDay(new Date(2026, 9, 26), [1, 2, 3, 4, 5])).toBe(true);
    expect(isWorkDay(new Date(2026, 9, 25), [1, 2, 3, 4, 5])).toBe(false);
  });

  it('moves the next check out when you skip', () => {
    const next = skipSpot(initialSpotSchedule(0, every), 5_000, 60_000);
    expect(next.nextDueMs).toBe(65_000);
  });
});

describe('spot verdict', () => {
  it('uses the median score and the most common issue', () => {
    const saved = verdictFromFrames([frame(50, 'lean'), frame(70, 'lean'), frame(60, 'headDrop')], 80);
    expect(saved.outcome).toBe('fix');
    expect(saved.score).toBe(60);
    expect(saved.issue).toBe('lean');
    expect(spotAlertCopy('lean', 3)).toBe("Posture check: you're leaning in. Ease back about 3 in.");
    expect(alertPlan('fix').notify).toBe(true);
    expect(alertPlan('good')).toEqual({ toast: 'Looking good', notify: false });
  });

  it('marks an empty chair as away and does not alert', () => {
    const away = verdictFromFrames([frame(0, null, false), frame(0, null, false), frame(90, 'lean')], 80);
    expect(away.outcome).toBe('away');
    expect(alertPlan('away')).toEqual({ toast: null, notify: false });
    const good = verdictFromFrames([frame(90, 'lean'), frame(88, null), frame(92, 'shoulders')], 80);
    expect(good.outcome).toBe('good');
    expect(good.issue).toBeNull();
  });

  it('suggests a stretch after the same issue three times', () => {
    const row = (issue: SpotRecord['issue']): SpotRecord => ({ at: 1, posture: 'sitting', score: 40, issue, outcome: 'fix' });
    expect(repeatedIssue([row('lean'), row('lean'), row('lean')])).toBe('lean');
    expect(repeatedIssue([row('lean'), row('lean'), { ...row('lean'), outcome: 'good' }])).toBeNull();
  });
});

describe('spot camera', () => {
  it('stops every track when sampling throws', async () => {
    const stopped: string[] = [];
    const stream: TrackedStream = {
      getTracks: () => [
        { stop: () => stopped.push('a') },
        { stop: () => stopped.push('b') },
      ],
    };
    await expect(withCamera(async () => stream, async () => {
      throw new Error('sample failed');
    })).rejects.toThrow('sample failed');
    expect(stopped).toEqual(['a', 'b']);
  });

  it('stops tracks after a normal sample and treats a busy camera as a single retry', async () => {
    const stopped: string[] = [];
    await withCamera(async () => ({ getTracks: () => [{ stop: () => stopped.push('ok') }] }), async () => 'done');
    expect(stopped).toEqual(['ok']);
    expect(classifyCameraError('NotReadableError')).toBe('busy');
    expect(classifyCameraError('NotAllowedError')).toBe('denied');
    const busy = noteCameraBusy({ ...initialSpotSchedule(0, every), inFlight: true }, 1_000);
    expect(busy.retryAtMs).toBe(1_000 + 2 * 60_000);
    expect(busy.retryArmed).toBe(false);
    const retry = stepSpotSchedule(busy, tick(busy.retryAtMs ?? 0));
    expect(retry.action).toBe('fire');
    const second = noteCameraBusy(retry.state, 200_000);
    expect(second.retryAtMs).toBeNull();
    expect(finishSpot(retry.state).inFlight).toBe(false);
  });

  it('stops a null stream without throwing', () => {
    expect(() => stopCameraTracks(null)).not.toThrow();
  });
});

describe('spot day summary', () => {
  it('counts today without treating away as a failed check', () => {
    const now = new Date(2026, 9, 25, 15, 0).getTime();
    const records: SpotRecord[] = [
      { at: now, posture: 'sitting', score: 90, issue: null, outcome: 'good' },
      { at: now, posture: 'standing', score: 70, issue: 'hipLean', outcome: 'fix' },
      { at: now, posture: 'sitting', score: null, issue: null, outcome: 'away' },
    ];
    expect(dailySummary(records, now)).toEqual({ checks: 3, good: 1 });
  });
});
