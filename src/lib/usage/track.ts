import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import {
  createAnonSessionId,
  isAnonSessionId,
  isUsageEvent,
  planUsageEvent,
  usageInsert,
  type UsageEventName,
  type UsageInsert,
  type UsageLedger,
  type UsagePlan,
} from './events';

const SESSION_KEY = 'deskzen.usage.session';
const SEEN_KEY = 'deskzen.usage.seen';
const TRY_NOW_KEY = 'deskzen.usage.tryNowAt';

export type UsageSender = (row: UsageInsert) => Promise<void> | void;

export type UsageAnalytics = (event: UsageEventName) => void;

export type UsageTracker = {
  track(event: string, path?: string | null, now?: number): void;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** The random id this browser tab already uses for usage counts, when it is a UUID v4. */
export function storedAnonSessionId(storage: Pick<Storage, 'getItem'> | null): string | null {
  try {
    const raw = storage?.getItem(SESSION_KEY) ?? null;
    return raw && isAnonSessionId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Separate from the sign-in client on purpose.
 * persistSession is off, so a signed-in person's access token is never attached.
 * Requests stay on the anon role. return=minimal avoids reading the row back.
 */
export function usageClientOptions(): SupabaseClientOptions<'public'> {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'deskzen.usage.nosession',
    },
    global: {
      headers: { Prefer: 'return=minimal' },
      fetch: keepaliveFetch,
    },
  };
}

function keepaliveFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const next: RequestInit = { ...init, keepalive: true };
  return fetch(input, next).catch(() => fetch(input, init));
}

export function notifyGoogleAnalytics(
  event: UsageEventName,
  gtag: ((command: 'event', name: UsageEventName) => void) | undefined,
): void {
  if (!gtag) return;
  try {
    gtag('event', event);
  } catch {
    // Analytics is optional and must not affect the app.
  }
}

export function readGtag(host: unknown): ((command: 'event', name: UsageEventName) => void) | undefined {
  if (!host || typeof host !== 'object' || !('gtag' in host)) return undefined;
  const gtag = (host as { gtag?: unknown }).gtag;
  if (typeof gtag !== 'function') return undefined;
  return (command, name) => {
    (gtag as (command: string, name: string) => void)(command, name);
  };
}

function readLedger(storage: StorageLike): UsageLedger {
  try {
    const sessionRaw = storage.getItem(SESSION_KEY);
    const seen = new Set<string>();
    const rawSeen = storage.getItem(SEEN_KEY);
    if (rawSeen) {
      const parsed: unknown = JSON.parse(rawSeen);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && isUsageEvent(item) && item !== 'try_now_click') seen.add(item);
        }
      }
    }
    const tryRaw = storage.getItem(TRY_NOW_KEY);
    const tryNum = tryRaw === null ? null : Number(tryRaw);
    return {
      sessionId: sessionRaw && isAnonSessionId(sessionRaw) ? sessionRaw : null,
      seen,
      lastTryNowAt: tryNum !== null && Number.isFinite(tryNum) ? tryNum : null,
    };
  } catch {
    return { sessionId: null, seen: new Set(), lastTryNowAt: null };
  }
}

function writeLedger(storage: StorageLike, plan: UsagePlan): void {
  storage.setItem(SESSION_KEY, plan.sessionId);
  const seen = [...plan.seen].filter((name) => isUsageEvent(name) && name !== 'try_now_click');
  storage.setItem(SEEN_KEY, JSON.stringify(seen));
  if (plan.lastTryNowAt !== null) storage.setItem(TRY_NOW_KEY, String(plan.lastTryNowAt));
}

export function createUsageTracker(deps: {
  storage: StorageLike | null;
  now?: () => number;
  newSessionId?: () => string;
  send: UsageSender;
  analytics?: UsageAnalytics;
}): UsageTracker {
  const memory: UsageLedger = { sessionId: null, seen: new Set(), lastTryNowAt: null };
  const newSessionId = deps.newSessionId ?? createAnonSessionId;
  return {
    track(event, path, now) {
      try {
        const storage = deps.storage;
        const ledger = storage ? readLedger(storage) : { sessionId: memory.sessionId, seen: memory.seen, lastTryNowAt: memory.lastTryNowAt };
        let nextSessionId = ledger.sessionId ?? '';
        if (!isAnonSessionId(nextSessionId)) nextSessionId = newSessionId();
        const plan = planUsageEvent({
          event,
          now: now ?? deps.now?.() ?? Date.now(),
          path,
          ledger,
          nextSessionId,
        });
        if (!plan.send || !isUsageEvent(event)) return;
        if (storage) writeLedger(storage, plan);
        memory.sessionId = plan.sessionId;
        memory.seen = new Set(plan.seen);
        memory.lastTryNowAt = plan.lastTryNowAt;
        const row = usageInsert(event, plan.sessionId, plan.path);
        try {
          void Promise.resolve(deps.send(row)).catch(() => undefined);
        } catch {
          // A failed count is skipped. The app keeps going.
        }
        try {
          deps.analytics?.(event);
        } catch {
          // Analytics is optional.
        }
      } catch {
        // Counting must never break the app.
      }
    },
  };
}

let usageClient: SupabaseClient | null = null;

async function sendToSupabase(row: UsageInsert): Promise<void> {
  if (import.meta.env.MODE === 'test') return;
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !key) return;
  try {
    usageClient ??= createClient(url, key, usageClientOptions());
    const { data } = await usageClient.auth.getSession();
    if (data.session) return;
    const payload: Record<string, unknown> = {
      event: row.event,
      anon_session: row.anon_session,
      path: row.path,
    };
    await usageClient.from('usage_events').insert(payload);
  } catch {
    // Silent. The product still works when the count cannot be saved.
  }
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

function browserPath(): string | null {
  try {
    if (typeof location === 'undefined') return null;
    return location.pathname;
  } catch {
    return null;
  }
}

const tracker = createUsageTracker({
  storage: browserStorage(),
  send: sendToSupabase,
  analytics: (event) => notifyGoogleAnalytics(event, readGtag(typeof globalThis === 'undefined' ? null : globalThis)),
});

/** Count one anonymous event. Safe to call from a click handler. Never throws. */
export function trackUsage(event: UsageEventName): void {
  tracker.track(event, browserPath());
}
