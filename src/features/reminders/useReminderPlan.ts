import { useEffect, useMemo, useState } from 'react';
import { holdsForDay, snoozedUntil } from '../../lib/reminders/holds';
import { planDay, type PlanLive } from '../../lib/reminders/plan';
import type { IntervalDurations, IntervalState } from '../../lib/wellness/intervals';
import type { RhythmDot } from '../../lib/wellness/rhythm';
import { useSession } from '../session/session-context';
import { useWellness } from '../wellness/wellness-context';
import { useReminderHolds } from './useReminderHolds';

export interface ReminderPlan {
  nowMs: number;
  nowMin: number;
  dots: RhythmDot[];
  next: RhythmDot | null;
  /** Snooze all end time (epoch ms), or null. */
  snoozedUntilMs: number | null;
}

/** Turns the live timers into minutes of today for the planner. */
export function liveAnchors(input: {
  nowMs: number;
  presenceMs: number;
  moveEveryMin: number;
  moveOn: boolean;
  spotNextDueMs: number | null;
  showIntervals: boolean;
  interval: IntervalState;
  durations: IntervalDurations;
}): Omit<PlanLive, 'holds'> {
  const now = new Date(input.nowMs);
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const live: Omit<PlanLive, 'holds'> = { weekday: now.getDay() };
  if (input.moveOn && input.moveEveryMin > 0) {
    live.moveDueMin = Math.ceil(nowMin + Math.max(0, input.moveEveryMin * 60_000 - input.presenceMs) / 60_000);
  }
  if (input.spotNextDueMs !== null) {
    live.spotDueMin = Math.ceil(nowMin + Math.max(0, input.spotNextDueMs - input.nowMs) / 60_000);
  }
  if (input.showIntervals && input.interval.phase !== 'move') {
    const cycle = Math.round((input.durations.sitMs + input.durations.standMs + input.durations.moveMs) / 60_000);
    live.stand = {
      dueMin: Math.ceil(nowMin + Math.max(0, input.interval.remainingMs) / 60_000),
      label: input.interval.phase === 'stand' ? 'Sit back down' : 'Stand up',
      cycleMin: cycle,
    };
  }
  return live;
}

/** Today's reminders from the shared planner, refreshed every few seconds. */
export function useReminderPlan(tickMs = 15_000): ReminderPlan {
  const session = useSession();
  const wellness = useWellness();
  const [holds] = useReminderHolds();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const { settings } = session;
  const moveEveryMin = settings.workStyle === 'stand' ? settings.standBreakMinutes : settings.breakMinutes;
  // Round the sitting timer to the minute so the plan does not churn every second.
  const presenceMin = Math.floor(session.presenceMs / 60_000);
  const intervalMin = Math.floor(wellness.interval.remainingMs / 60_000);
  return useMemo(() => {
    const now = new Date(nowMs);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const live = liveAnchors({
      nowMs,
      presenceMs: presenceMin * 60_000,
      moveEveryMin,
      moveOn: settings.moveBreaks,
      spotNextDueMs: session.spotNextDueMs,
      showIntervals: wellness.showIntervals,
      interval: { ...wellness.interval, remainingMs: intervalMin * 60_000 },
      durations: wellness.durations,
    });
    const dots = planDay(settings, nowMin, { ...live, holds: holdsForDay(holds, nowMs) });
    return { nowMs, nowMin, dots, next: dots[0] ?? null, snoozedUntilMs: snoozedUntil(holds, nowMs) };
  }, [nowMs, settings, holds, presenceMin, moveEveryMin, session.spotNextDueMs, wellness.showIntervals, wellness.interval, intervalMin, wellness.durations]);
}
