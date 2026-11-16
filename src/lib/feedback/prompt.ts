import { createAnonSessionId, isAnonSessionId, safeUsagePath } from '../usage/events';
import { storedAnonSessionId } from '../usage/track';

/** Continuous camera-on time in Live view before we ask. */
export const FEEDBACK_MIN_LIVE_MS = 2 * 60 * 1000;

/** One prompt per browser, then quiet for a week. */
export const FEEDBACK_GAP_MS = 7 * 24 * 60 * 60 * 1000;

export const FEEDBACK_MESSAGE_MAX = 1000;

export const FEEDBACK_SHOWN_KEY = 'deskzen.feedback.lastShown';

export type FeedbackRating = 'up' | 'down';

/** The only fields the browser may insert. No email, account, photo, or posture data. */
export type FeedbackInsert = {
  rating: FeedbackRating;
  message: string | null;
  anon_session: string;
  page: string | null;
};

type Memory = Pick<Storage, 'getItem' | 'setItem'>;

export function feedbackDue(input: {
  liveMs: number;
  lastShownAt: number | null;
  now: number;
}): boolean {
  if (!Number.isFinite(input.liveMs) || input.liveMs < FEEDBACK_MIN_LIVE_MS) return false;
  if (input.lastShownAt === null || !Number.isFinite(input.lastShownAt)) return true;
  return input.now - input.lastShownAt >= FEEDBACK_GAP_MS;
}

export function readLastShown(storage: Pick<Storage, 'getItem'>): number | null {
  try {
    const raw = storage.getItem(FEEDBACK_SHOWN_KEY);
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  } catch {
    return null;
  }
}

export function markFeedbackShown(storage: Pick<Storage, 'setItem'>, now: number): void {
  storage.setItem(FEEDBACK_SHOWN_KEY, String(now));
}

/**
 * Same random id as the usage counter when this tab already has one.
 * Otherwise a new UUID v4 from the platform. Never derived from the person.
 */
export function feedbackAnonSession(
  storage: Pick<Storage, 'getItem'> | null,
  create: () => string = createAnonSessionId,
): string {
  return storedAnonSessionId(storage) ?? create();
}

/** Build an insert row, or null when the rating, note, or id should not be stored. */
export function prepareFeedback(input: {
  rating: string | null;
  message: string;
  anonSession: string;
  page: string | null;
}): FeedbackInsert | null {
  if (input.rating !== 'up' && input.rating !== 'down') return null;
  if (!isAnonSessionId(input.anonSession)) return null;
  const trimmed = input.message.trim();
  if (trimmed.length > FEEDBACK_MESSAGE_MAX) return null;
  return {
    rating: input.rating,
    message: trimmed.length > 0 ? trimmed : null,
    anon_session: input.anonSession,
    page: safeUsagePath(input.page),
  };
}

export type FeedbackDecision = { show: false } | { show: true; page: string | null };

/**
 * After a Live session stops. Shows at most once per 7 days, and only when
 * the session lasted at least 2 minutes. Records the shown time first.
 */
export function decideFeedback(input: {
  liveMs: number;
  now: number;
  page: string | null;
  storage: Memory | null;
}): FeedbackDecision {
  if (!input.storage) return { show: false };
  if (
    !feedbackDue({
      liveMs: input.liveMs,
      lastShownAt: readLastShown(input.storage),
      now: input.now,
    })
  ) {
    return { show: false };
  }
  try {
    markFeedbackShown(input.storage, input.now);
  } catch {
    return { show: false };
  }
  return { show: true, page: safeUsagePath(input.page) };
}
