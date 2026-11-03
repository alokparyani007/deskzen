export const SPOT_COUNTDOWN_MS = 3_000;
export const SPOT_BUSY_RETRY_MS = 2 * 60_000;
export const SPOT_SNOOZE_MS = 60 * 60_000;
export const SPOT_WARMUP_MS = 2_000;

export interface SpotSchedule {
  nextDueMs: number;
  retryAtMs: number | null;
  /** One quiet retry after a busy camera, then wait for the next interval. */
  retryArmed: boolean;
  snoozeUntilMs: number | null;
  inFlight: boolean;
}

export interface SpotTick {
  nowMs: number;
  everyMs: number;
  quiet: boolean;
  workDay: boolean;
  focusActive: boolean;
  skipFocus: boolean;
  hidden: boolean;
}

export type SpotTickAction = 'wait' | 'countdown' | 'fire' | 'quiet' | 'offday' | 'focus' | 'snooze';

export function initialSpotSchedule(nowMs: number, everyMs: number): SpotSchedule {
  return {
    nextDueMs: nowMs + everyMs,
    retryAtMs: null,
    retryArmed: true,
    snoozeUntilMs: null,
    inFlight: false,
  };
}

export function isQuietWindow(start: string, end: string, date: Date): boolean {
  const now = date.getHours() * 60 + date.getMinutes();
  const from = clockMinutes(start);
  const to = clockMinutes(end);
  if (from === to) return false;
  if (from < to) return now >= from && now < to;
  return now >= from || now < to;
}

export function isWorkDay(date: Date, days: readonly number[]): boolean {
  return days.includes(date.getDay());
}

/** One check when the timer is due, even if several intervals were missed while throttled. */
export function stepSpotSchedule(state: SpotSchedule, input: SpotTick): { state: SpotSchedule; action: SpotTickAction; countdownSec: number | null } {
  if (state.inFlight) return { state, action: 'wait', countdownSec: null };
  const snoozed = state.snoozeUntilMs !== null && input.nowMs < state.snoozeUntilMs;
  if (snoozed) return { state, action: 'snooze', countdownSec: null };

  const blocked = blockReason(input);
  if (blocked) {
    const nextDueMs = input.nowMs >= state.nextDueMs ? input.nowMs + input.everyMs : state.nextDueMs;
    return {
      state: { ...state, nextDueMs, retryAtMs: null },
      action: blocked,
      countdownSec: null,
    };
  }

  if (state.retryAtMs !== null && input.nowMs >= state.retryAtMs) {
    return {
      state: {
        ...state,
        retryAtMs: null,
        inFlight: true,
        nextDueMs: Math.max(state.nextDueMs, input.nowMs + input.everyMs),
      },
      action: 'fire',
      countdownSec: null,
    };
  }

  const lead = state.nextDueMs - input.nowMs;
  if (!input.hidden && lead > 0 && lead <= SPOT_COUNTDOWN_MS) {
    return { state, action: 'countdown', countdownSec: Math.max(1, Math.ceil(lead / 1000)) };
  }
  if (input.nowMs < state.nextDueMs) return { state, action: 'wait', countdownSec: null };

  return {
    state: { ...state, inFlight: true, nextDueMs: input.nowMs + input.everyMs },
    action: 'fire',
    countdownSec: null,
  };
}

export function noteCameraBusy(state: SpotSchedule, nowMs: number): SpotSchedule {
  if (!state.retryArmed) return { ...state, retryAtMs: null, inFlight: false };
  return { ...state, retryAtMs: nowMs + SPOT_BUSY_RETRY_MS, retryArmed: false, inFlight: false };
}

export function finishSpot(state: SpotSchedule): SpotSchedule {
  return { ...state, inFlight: false, retryArmed: true };
}

export function skipSpot(state: SpotSchedule, nowMs: number, everyMs: number): SpotSchedule {
  return { ...state, nextDueMs: nowMs + everyMs, inFlight: false };
}

/** Run a check shortly after the user turns off a pause (quiet hours, day off, focus). */
export function releaseSpot(state: SpotSchedule, nowMs: number, leadMs = 4_000): SpotSchedule {
  return { ...state, nextDueMs: nowMs + leadMs, snoozeUntilMs: null, retryAtMs: null, inFlight: false };
}

export function snoozeSpot(state: SpotSchedule, nowMs: number, ms = SPOT_SNOOZE_MS): SpotSchedule {
  return { ...state, snoozeUntilMs: nowMs + ms, nextDueMs: nowMs + ms, retryAtMs: null, inFlight: false };
}

function blockReason(input: SpotTick): 'quiet' | 'offday' | 'focus' | null {
  if (input.quiet) return 'quiet';
  if (!input.workDay) return 'offday';
  if (input.skipFocus && input.focusActive) return 'focus';
  return null;
}

function clockMinutes(value: string): number {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}
