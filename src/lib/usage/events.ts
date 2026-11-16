/** Anonymous usage events. Keep this list identical to the check in supabase/migrations. */

export const USAGE_EVENTS = [
  'try_now_click',
  'app_open',
  'zen_started',
  'zen_saved',
  'live_started',
  'live_5min',
  'sign_in_completed',
] as const;

export type UsageEventName = (typeof USAGE_EVENTS)[number];

/** Extra clicks inside this window count once. Other events are once per browser tab. */
export const TRY_NOW_MIN_GAP_MS = 1000;

/** Continuous time in Live view with the camera on before live_5min. */
export const LIVE_FIVE_MIN_MS = 5 * 60 * 1000;

/** UUID v4. Same pattern as usage_events_anon_session_check. */
export const ANON_SESSION_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const EVENT_SET: ReadonlySet<string> = new Set(USAGE_EVENTS);

export function isUsageEvent(value: string): value is UsageEventName {
  return EVENT_SET.has(value);
}

export function isAnonSessionId(value: string): boolean {
  return ANON_SESSION_RE.test(value);
}

/**
 * Page path we are willing to store.
 * Query strings and hashes are dropped first so emails and sign-in tokens never qualify.
 */
export function safeUsagePath(input: string | null | undefined): string | null {
  if (typeof input !== 'string' || input.length === 0) return null;
  const path = input.split('#')[0]?.split('?')[0] ?? '';
  if (!/^\/[a-z0-9/_-]{0,79}$/.test(path)) return null;
  return path;
}

export type UsageLedger = {
  sessionId: string | null;
  /** Events already counted in this browser tab, aside from try_now_click. */
  seen: ReadonlySet<string>;
  lastTryNowAt: number | null;
};

export type UsagePlan = {
  send: boolean;
  sessionId: string;
  seen: ReadonlySet<string>;
  lastTryNowAt: number | null;
  path: string | null;
};

export type UsageInsert = {
  event: UsageEventName;
  anon_session: string;
  path: string | null;
};

/**
 * Decides whether this event should be counted.
 * try_now_click can repeat after a short gap. Every other event is once per tab session.
 */
export function planUsageEvent(input: {
  event: string;
  now: number;
  path: string | null | undefined;
  ledger: UsageLedger;
  nextSessionId: string;
}): UsagePlan {
  const path = safeUsagePath(input.path);
  const stored = input.ledger.sessionId;
  const sessionId = stored && isAnonSessionId(stored) ? stored : input.nextSessionId;
  const keep: UsagePlan = {
    send: false,
    sessionId,
    seen: input.ledger.seen,
    lastTryNowAt: input.ledger.lastTryNowAt,
    path,
  };
  if (!isUsageEvent(input.event) || !isAnonSessionId(sessionId)) return keep;

  if (input.event === 'try_now_click') {
    const last = input.ledger.lastTryNowAt;
    if (last !== null && input.now - last < TRY_NOW_MIN_GAP_MS) return keep;
    return { send: true, sessionId, seen: input.ledger.seen, lastTryNowAt: input.now, path };
  }

  if (input.ledger.seen.has(input.event)) return keep;
  const seen = new Set(input.ledger.seen);
  seen.add(input.event);
  return { send: true, sessionId, seen, lastTryNowAt: input.ledger.lastTryNowAt, path };
}

/** The only fields the browser may insert. */
export function usageInsert(event: UsageEventName, sessionId: string, path: string | null): UsageInsert {
  return { event, anon_session: sessionId, path };
}

export function liveFiveMinReached(startedAtMs: number, nowMs: number): boolean {
  return nowMs - startedAtMs >= LIVE_FIVE_MIN_MS;
}

/** Random id from the platform. Not derived from the device or the person. */
export function createAnonSessionId(randomUUID: () => string = () => crypto.randomUUID()): string {
  const id = randomUUID();
  if (!isAnonSessionId(id)) throw new Error('Invalid anonymous session id');
  return id;
}
