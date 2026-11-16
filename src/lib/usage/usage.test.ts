import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  LIVE_FIVE_MIN_MS,
  TRY_NOW_MIN_GAP_MS,
  USAGE_EVENTS,
  createAnonSessionId,
  isAnonSessionId,
  liveFiveMinReached,
  planUsageEvent,
  safeUsagePath,
  usageInsert,
} from './events';
import { createUsageTracker, notifyGoogleAnalytics, usageClientOptions, type UsageInsert } from './track';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

function tracker(storage: ReturnType<typeof memory> | null, send: (row: UsageInsert) => void) {
  return createUsageTracker({ storage, send, newSessionId: () => SESSION });
}

describe('usage event helper', () => {
  it('counts each event once per browser session, and try now again after a short gap', () => {
    const storage = memory();
    const sent: UsageInsert[] = [];
    const count = tracker(storage, (row) => sent.push(row));

    count.track('app_open', '/app', 1_000);
    count.track('app_open', '/app', 2_000);
    count.track('try_now_click', '/', 5_000);
    count.track('try_now_click', '/', 5_000 + TRY_NOW_MIN_GAP_MS - 1);
    count.track('try_now_click', '/learn', 5_000 + TRY_NOW_MIN_GAP_MS);

    expect(sent.map((row) => row.event)).toEqual(['app_open', 'try_now_click', 'try_now_click']);
    expect(sent.every((row) => row.anon_session === SESSION)).toBe(true);

    const again = tracker(storage, (row) => sent.push(row));
    again.track('app_open', '/app', 9_000);
    again.track('zen_saved', '/set-my-zen', 9_000);
    expect(sent.map((row) => row.event)).toEqual(['app_open', 'try_now_click', 'try_now_click', 'zen_saved']);
  });

  it('drops query strings, hashes, and anything that is not a short path', () => {
    expect(safeUsagePath('/login?email=maya@example.com')).toBe('/login');
    expect(safeUsagePath('/app#access_token=secret&refresh_token=secret')).toBe('/app');
    expect(safeUsagePath('/set-my-zen?pose=sit')).toBe('/set-my-zen');
    expect(safeUsagePath('/')).toBe('/');
    expect(safeUsagePath('/Live')).toBeNull();
    expect(safeUsagePath(`/${'a'.repeat(80)}`)).toBeNull();
    expect(safeUsagePath('https://deskzenapp.com/app')).toBeNull();

    const sent: UsageInsert[] = [];
    tracker(memory(), (row) => sent.push(row)).track('zen_started', '/set-my-zen?pose=sit#access_token=nope', 1);
    expect(sent[0]).toEqual({ event: 'zen_started', anon_session: SESSION, path: '/set-my-zen' });
    expect(Object.keys(sent[0] ?? {}).sort()).toEqual(['anon_session', 'event', 'path']);
  });

  it('replaces a stored id that is not a random uuid and ignores unknown events', () => {
    const storage = memory();
    storage.setItem('deskzen.usage.session', 'maya@example.com');
    const sent: UsageInsert[] = [];
    tracker(storage, (row) => sent.push(row)).track('live_started', '/live', 1);
    expect(sent[0]?.anon_session).toBe(SESSION);
    expect(storage.getItem('deskzen.usage.session')).toBe(SESSION);

    const plan = planUsageEvent({
      event: 'signed_in_email',
      now: 1,
      path: '/app',
      ledger: { sessionId: SESSION, seen: new Set(), lastTryNowAt: null },
      nextSessionId: SESSION,
    });
    expect(plan.send).toBe(false);
    expect(usageInsert('sign_in_completed', SESSION, null)).toEqual({
      event: 'sign_in_completed',
      anon_session: SESSION,
      path: null,
    });
  });

  it('still dedupes when the tab has no storage, and a failed send stays quiet', async () => {
    const sent: UsageInsert[] = [];
    const count = tracker(null, (row) => sent.push(row));
    count.track('live_5min', '/live', 1);
    count.track('live_5min', '/live', 2);
    expect(sent).toHaveLength(1);

    const broken = createUsageTracker({
      storage: memory(),
      newSessionId: () => SESSION,
      send: () => {
        throw new Error('offline');
      },
      analytics: () => {
        throw new Error('ga');
      },
    });
    expect(() => broken.track('app_open', '/app', 1)).not.toThrow();

    const rejected = createUsageTracker({
      storage: memory(),
      newSessionId: () => SESSION,
      send: () => Promise.reject(new Error('down')),
    });
    rejected.track('zen_started', '/set-my-zen', 1);
    await Promise.resolve();
  });

  it('sends the event name to Google Analytics and nothing else', () => {
    const calls: unknown[][] = [];
    notifyGoogleAnalytics('app_open', (...args) => {
      calls.push(args);
    });
    notifyGoogleAnalytics('zen_saved', undefined);
    expect(() =>
      notifyGoogleAnalytics('live_started', () => {
        throw new Error('blocked');
      }),
    ).not.toThrow();
    expect(calls).toEqual([['event', 'app_open']]);
  });

  it('keeps the usage client anonymous', () => {
    const options = usageClientOptions();
    expect(options.auth?.persistSession).toBe(false);
    expect(options.auth?.autoRefreshToken).toBe(false);
    expect(options.auth?.detectSessionInUrl).toBe(false);
    expect(options.auth?.storageKey).toBe('deskzen.usage.nosession');
    expect(options.global?.headers).toMatchObject({ Prefer: 'return=minimal' });
    expect(JSON.stringify(options.auth)).not.toContain('service_role');
  });

  it('marks five continuous minutes, and only five', () => {
    expect(LIVE_FIVE_MIN_MS).toBe(5 * 60 * 1000);
    expect(liveFiveMinReached(1_000, 1_000 + LIVE_FIVE_MIN_MS - 1)).toBe(false);
    expect(liveFiveMinReached(1_000, 1_000 + LIVE_FIVE_MIN_MS)).toBe(true);
  });

  it('accepts a platform random uuid', () => {
    expect(isAnonSessionId(createAnonSessionId())).toBe(true);
  });

  it('matches the event names stored in the migration', () => {
    const sql = readdirSync('supabase/migrations')
      .filter((name) => name.endsWith('.sql'))
      .map((name) => readFileSync(`supabase/migrations/${name}`, 'utf8'))
      .join('\n');
    for (const event of USAGE_EVENTS) expect(sql).toContain(`'${event}'`);
    expect(sql.toLowerCase()).toContain('enable row level security');
    expect(sql.toLowerCase()).toContain('grant insert (event, anon_session, path)');
    expect(sql.toLowerCase()).not.toContain('grant select');
    expect(sql).not.toMatch(/for\s+select/i);
    expect(sql).not.toMatch(/for\s+update/i);
    expect(sql).not.toMatch(/for\s+delete/i);
    expect(sql).toMatch(/for\s+insert/i);
    expect(sql).not.toContain('service_role');
  });
});
