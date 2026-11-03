import type { ReminderKind } from '../wellness/rhythm';

/**
 * Snoozes and "done" marks for reminders, shared by the Reminders page, the
 * session chrome, spot checks and the wellness timers. Saved on this device only.
 */
export interface ReminderHolds {
  /** Snooze all: nothing fires before this time (epoch ms). 0 when off. */
  all: number;
  /** Per-type snooze end times (epoch ms). */
  kinds: Partial<Record<ReminderKind, number>>;
  /** When a reminder was last marked done (epoch ms). The next one counts from here. */
  done: Partial<Record<ReminderKind, number>>;
}

export const allReminderKinds: readonly ReminderKind[] = ['posture', 'move', 'water', 'eye', 'stand', 'spot'];

export const emptyHolds: ReminderHolds = { all: 0, kinds: {}, done: {} };

const HOLDS_KEY = 'sitglow.reminderHolds';

/** The time this type is held until (epoch ms), or 0. */
export function holdEnd(holds: ReminderHolds, kind: ReminderKind): number {
  return Math.max(holds.all, holds.kinds[kind] ?? 0);
}

export function isHeld(holds: ReminderHolds, kind: ReminderKind, nowMs: number): boolean {
  return nowMs < holdEnd(holds, kind);
}

export function snoozeAll(holds: ReminderHolds, nowMs: number, minutes: number): ReminderHolds {
  return { ...holds, all: nowMs + minutes * 60_000 };
}

export function snoozeKind(holds: ReminderHolds, kind: ReminderKind, nowMs: number, minutes: number): ReminderHolds {
  return { ...holds, kinds: { ...holds.kinds, [kind]: nowMs + minutes * 60_000 } };
}

export function resumeAll(holds: ReminderHolds): ReminderHolds {
  return { ...holds, all: 0, kinds: {} };
}

export function markDone(holds: ReminderHolds, kind: ReminderKind, nowMs: number): ReminderHolds {
  const kinds = { ...holds.kinds };
  delete kinds[kind];
  return { ...holds, kinds, done: { ...holds.done, [kind]: nowMs } };
}

/** Snooze all end time, or null when it is not on. */
export function snoozedUntil(holds: ReminderHolds, nowMs: number): number | null {
  return holds.all > nowMs ? holds.all : null;
}

export interface DayHolds {
  /** Minute of today each type is held until. Past holds are left out; holds past midnight read as 1440+. */
  until: Partial<Record<ReminderKind, number>>;
  /** Minute of today each type was marked done. */
  done: Partial<Record<ReminderKind, number>>;
}

/** Holds in minutes of the local day, for the day planner. */
export function holdsForDay(holds: ReminderHolds, nowMs: number): DayHolds {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const dayStart = start.getTime();
  const toMinute = (ms: number) => (ms - dayStart) / 60_000;
  const until: DayHolds['until'] = {};
  const done: DayHolds['done'] = {};
  for (const kind of allReminderKinds) {
    const end = holdEnd(holds, kind);
    if (end > nowMs) until[kind] = Math.ceil(toMinute(end));
    const finished = holds.done[kind];
    if (finished !== undefined && finished >= dayStart && finished <= nowMs) done[kind] = Math.floor(toMinute(finished));
  }
  return { until, done };
}

// A tiny shared store so every screen sees the same holds right away.
let current: ReminderHolds | null = null;
const listeners = new Set<() => void>();

export function getHolds(): ReminderHolds {
  if (current === null) current = readHolds();
  return current;
}

export function setHolds(update: (holds: ReminderHolds) => ReminderHolds): void {
  current = update(getHolds());
  try {
    window.localStorage.setItem(HOLDS_KEY, JSON.stringify(current));
  } catch {
    // Storage can be full or blocked. The in-memory copy still works.
  }
  for (const listener of listeners) listener();
}

export function subscribeHolds(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readHolds(): ReminderHolds {
  try {
    if (typeof window === 'undefined') return emptyHolds;
    const raw = window.localStorage.getItem(HOLDS_KEY);
    if (!raw) return emptyHolds;
    const parsed = JSON.parse(raw) as Partial<ReminderHolds>;
    return {
      all: typeof parsed.all === 'number' ? parsed.all : 0,
      kinds: parsed.kinds && typeof parsed.kinds === 'object' ? parsed.kinds : {},
      done: parsed.done && typeof parsed.done === 'object' ? parsed.done : {},
    };
  } catch {
    return emptyHolds;
  }
}
