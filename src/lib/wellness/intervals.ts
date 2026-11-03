import type { AppSettings } from '../settings/defaults';
import { wellnessConfig } from './config';

export type IntervalPhase = 'sit' | 'stand' | 'move';
export type IntervalNudge = 'stand' | 'sit' | 'move';

export interface IntervalDurations {
  sitMs: number;
  standMs: number;
  moveMs: number;
}

export interface IntervalState {
  phase: IntervalPhase;
  remainingMs: number;
  due: boolean;
  nudge: IntervalNudge | null;
  ignoredMs: number;
  renudged: boolean;
  snoozeMs: number;
  busyDelayMs: number;
  switches: number;
  sitMs: number;
  standMs: number;
  moveMs: number;
}

export interface IntervalInput {
  dtMs: number;
  detected: 'sitting' | 'standing' | 'away';
  busy: boolean;
  noDesk: boolean;
  durations: IntervalDurations;
  speed?: number;
}

export function durationsFor(settings: Pick<AppSettings, 'intervalPreset' | 'customSitMin' | 'customStandMin' | 'customMoveMin'>): IntervalDurations {
  const picked =
    settings.intervalPreset === 'custom'
      ? { sit: settings.customSitMin, stand: settings.customStandMin, move: settings.customMoveMin }
      : wellnessConfig.presets[settings.intervalPreset];
  return { sitMs: picked.sit * 60_000, standMs: picked.stand * 60_000, moveMs: picked.move * 60_000 };
}

export function initialInterval(durations: IntervalDurations): IntervalState {
  return {
    phase: 'sit',
    remainingMs: durations.sitMs,
    due: false,
    nudge: null,
    ignoredMs: 0,
    renudged: false,
    snoozeMs: 0,
    busyDelayMs: 0,
    switches: 0,
    sitMs: 0,
    standMs: 0,
    moveMs: 0,
  };
}

export function stepInterval(state: IntervalState, input: IntervalInput): IntervalState {
  const dt = Math.max(0, input.dtMs) * (input.speed ?? 1);
  if (input.detected === 'away' || dt <= 0) return state;

  let next = addTime(state, input.detected, dt);
  if (next.phase === 'sit' && input.detected === 'standing' && !input.noDesk) {
    return begin(next, 'stand', input.durations, input.noDesk, true);
  }
  if (next.phase === 'stand' && input.detected === 'sitting') {
    return begin(next, 'sit', input.durations, input.noDesk, true);
  }
  if (next.snoozeMs > 0) {
    next = { ...next, snoozeMs: Math.max(0, next.snoozeMs - dt), nudge: null };
    if (next.snoozeMs > 0) return next;
  }
  if (!next.due) {
    next = { ...next, remainingMs: next.remainingMs - dt };
    if (next.remainingMs > 0) return next;
    if (next.phase === 'move') return begin(next, 'sit', input.durations, input.noDesk, false);
    if (next.phase === 'sit' && input.noDesk) return { ...begin(next, 'move', input.durations, true, false), nudge: 'move' };
    if (next.phase === 'stand' && input.durations.moveMs > 0) {
      return { ...begin(next, 'move', input.durations, input.noDesk, false), nudge: 'move' };
    }
    next = {
      ...next,
      remainingMs: 0,
      due: true,
      ignoredMs: 0,
      renudged: false,
      busyDelayMs: 0,
      nudge: next.phase === 'sit' ? 'stand' : 'sit',
    };
    return next;
  }
  return promptWait(next, input, dt);
}

export function snoozeInterval(state: IntervalState): IntervalState {
  return { ...state, snoozeMs: wellnessConfig.snoozeMs, nudge: null, ignoredMs: 0, renudged: false };
}

export function skipInterval(state: IntervalState, durations: IntervalDurations, noDesk: boolean): IntervalState {
  if (state.phase === 'sit') return begin(state, noDesk ? 'move' : 'stand', durations, noDesk, false);
  if (state.phase === 'stand' && durations.moveMs > 0) return { ...begin(state, 'move', durations, noDesk, false), nudge: 'move' };
  return begin(state, 'sit', durations, noDesk, false);
}

export function intervalMessage(nudge: IntervalNudge | null, moveMinutes = 2): string | null {
  if (nudge === 'stand') return 'Time to stand and stretch your legs';
  if (nudge === 'sit') return 'Nice, you can sit back down';
  if (nudge === 'move') return `Move for ${moveMinutes} minutes`;
  return null;
}

function promptWait(state: IntervalState, input: IntervalInput, dt: number): IntervalState {
  if (input.busy && state.busyDelayMs < wellnessConfig.busyDelayMs) {
    return { ...state, busyDelayMs: Math.min(wellnessConfig.busyDelayMs, state.busyDelayMs + dt), nudge: null };
  }
  const ignoredMs = state.ignoredMs + dt;
  const renudged = state.renudged || ignoredMs >= wellnessConfig.renudgeMs;
  const nudge: IntervalNudge = state.phase === 'sit' ? (input.noDesk ? 'move' : 'stand') : 'sit';
  return { ...state, ignoredMs, renudged, nudge };
}

export function addDetectedTime(state: IntervalState, detected: IntervalInput['detected'], dt: number): IntervalState {
  return addTime(state, detected, dt);
}

function addTime(state: IntervalState, detected: IntervalInput['detected'], dt: number): IntervalState {
  if (state.phase === 'move') return { ...state, moveMs: state.moveMs + dt };
  if (detected === 'standing') return { ...state, standMs: state.standMs + dt };
  return { ...state, sitMs: state.sitMs + dt };
}

function begin(state: IntervalState, phase: IntervalPhase, durations: IntervalDurations, noDesk: boolean, countSwitch: boolean): IntervalState {
  return {
    ...state,
    phase,
    remainingMs: phase === 'sit' ? durations.sitMs : phase === 'stand' ? durations.standMs : noDesk ? durations.standMs + durations.moveMs : Math.max(durations.moveMs, 60_000),
    due: false,
    nudge: null,
    ignoredMs: 0,
    renudged: false,
    snoozeMs: 0,
    busyDelayMs: 0,
    switches: state.switches + (countSwitch ? 1 : 0),
  };
}

export function stepReminder(elapsedMs: number, intervalMs: number, enabled: boolean, dtMs: number): { elapsedMs: number; fired: boolean } {
  if (!enabled || intervalMs <= 0) return { elapsedMs: 0, fired: false };
  const elapsed = elapsedMs + Math.max(0, dtMs);
  if (elapsed >= intervalMs) return { elapsedMs: 0, fired: true };
  return { elapsedMs: elapsed, fired: false };
}
