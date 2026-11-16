/** A Live session has to last this long before we ask. */
export const FEEDBACK_MIN_MS = 2 * 60 * 1000;

/** Automatic prompts wait this long after the card was last shown. */
export const FEEDBACK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const FEEDBACK_MAX_CHARS = 1000;

/** localStorage. One browser, not one tab. */
export const FEEDBACK_SHOWN_KEY = 'deskzen.feedback.lastShown';

/**
 * True when a stopped Live session was long enough and the card has not
 * been shown in the last 7 days. Settings can open the card either way.
 */
export function sessionShouldAsk(
  durationMs: number,
  lastShownAt: number | null,
  now: number,
): boolean {
  if (!Number.isFinite(durationMs) || durationMs < FEEDBACK_MIN_MS) return false;
  if (lastShownAt === null || !Number.isFinite(lastShownAt)) return true;
  return now - lastShownAt >= FEEDBACK_COOLDOWN_MS;
}

export function readLastShown(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export type LiveClock = { startedAt: number | null };

/** Tracks one continuous camera-on stretch in Live view. */
export function noteLive(
  clock: LiveClock,
  live: boolean,
  now: number,
): { clock: LiveClock; endedMs: number | null } {
  if (live) {
    if (clock.startedAt !== null) return { clock, endedMs: null };
    return { clock: { startedAt: now }, endedMs: null };
  }
  if (clock.startedAt === null) return { clock, endedMs: null };
  return { clock: { startedAt: null }, endedMs: now - clock.startedAt };
}

/** Blank notes are stored as null. Longer notes are cut to 1000 characters. */
export function feedbackMessage(raw: string): string | null {
  const trimmed = raw.trim().slice(0, FEEDBACK_MAX_CHARS);
  return trimmed.length > 0 ? trimmed : null;
}
