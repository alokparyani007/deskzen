import type { SignalKey } from './types';

export type NudgePhase = 'ok' | 'below' | 'nudging' | 'cooldown' | 'snoozed';

export interface NudgeState {
  phase: NudgePhase;
  accumulatedBelowMs: number;
  lastTickMs: number | null;
  cooldownUntilMs: number | null;
  snoozeUntilMs: number | null;
  nudgeTimes: number[];
  highSinceMs: number | null;
  issue?: SignalKey;
}

export interface NudgeInput {
  nowMs: number;
  score: number;
  good: boolean;
  threshold: number;
  sustainMs: number;
  cooldownMs: number;
  snoozeMs: number;
  maxPerHour: number;
  focusQuiet: boolean;
  issue?: SignalKey;
}

export function initialNudgeState(): NudgeState {
  return {
    phase: 'ok',
    accumulatedBelowMs: 0,
    lastTickMs: null,
    cooldownUntilMs: null,
    snoozeUntilMs: null,
    nudgeTimes: [],
    highSinceMs: null,
  };
}

export function stepNudge(state: NudgeState, input: NudgeInput): { state: NudgeState; show: boolean; recovered: boolean } {
  const dt = state.lastTickMs === null ? 0 : Math.max(0, input.nowMs - state.lastTickMs);
  let next: NudgeState = {
    ...state,
    lastTickMs: input.nowMs,
    nudgeTimes: state.nudgeTimes.filter((time) => input.nowMs - time < 3_600_000),
  };
  if (next.phase === 'cooldown' && next.cooldownUntilMs !== null && input.nowMs >= next.cooldownUntilMs) {
    next = { ...next, phase: 'ok', cooldownUntilMs: null, accumulatedBelowMs: 0 };
  }
  if (next.phase === 'snoozed' && next.snoozeUntilMs !== null && input.nowMs >= next.snoozeUntilMs) {
    next = { ...next, phase: 'ok', snoozeUntilMs: null, accumulatedBelowMs: 0 };
  }

  const blocked = next.phase === 'cooldown' || next.phase === 'snoozed';
  if (next.phase === 'nudging') {
    if (input.score >= input.threshold + 10) {
      const since = next.highSinceMs ?? input.nowMs;
      next = { ...next, highSinceMs: since };
      if (input.nowMs - since >= 3000) {
        return { state: startCooldown(next, input), show: false, recovered: true };
      }
    } else {
      next = { ...next, highSinceMs: null };
    }
    return { state: next, show: false, recovered: false };
  }

  if (!blocked && input.good && input.score < input.threshold) {
    const accumulated = (next.phase === 'below' ? next.accumulatedBelowMs : 0) + dt;
    const ready = accumulated >= input.sustainMs && next.nudgeTimes.length < input.maxPerHour && !input.focusQuiet;
    if (ready) {
      return {
        state: {
          ...next,
          phase: 'nudging',
          accumulatedBelowMs: accumulated,
          issue: input.issue,
          highSinceMs: null,
          nudgeTimes: [...next.nudgeTimes, input.nowMs],
        },
        show: true,
        recovered: false,
      };
    }
    return {
      state: { ...next, phase: 'below', accumulatedBelowMs: accumulated, highSinceMs: null },
      show: false,
      recovered: false,
    };
  }

  if (next.phase === 'below' && input.score >= input.threshold + 5) {
    return { state: { ...next, phase: 'ok', accumulatedBelowMs: 0 }, show: false, recovered: false };
  }
  return { state: next, show: false, recovered: false };
}

export function fixedIt(state: NudgeState, nowMs: number, cooldownMs: number): NudgeState {
  return startCooldown({ ...state, lastTickMs: nowMs }, { nowMs, cooldownMs });
}

export function snoozeNudge(state: NudgeState, nowMs: number, snoozeMs: number): NudgeState {
  return { ...state, phase: 'snoozed', snoozeUntilMs: nowMs + snoozeMs, accumulatedBelowMs: 0, lastTickMs: nowMs };
}

function startCooldown(state: NudgeState, input: { nowMs: number; cooldownMs: number }): NudgeState {
  return {
    ...state,
    phase: 'cooldown',
    cooldownUntilMs: input.nowMs + input.cooldownMs,
    accumulatedBelowMs: 0,
    highSinceMs: null,
  };
}
