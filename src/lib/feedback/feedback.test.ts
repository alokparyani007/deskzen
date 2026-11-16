import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createUsageTracker, anonSessionId, type UsageInsert } from '../usage/track';
import {
  FEEDBACK_COOLDOWN_MS,
  FEEDBACK_MAX_CHARS,
  FEEDBACK_MIN_MS,
  feedbackMessage,
  noteLive,
  readLastShown,
  sessionShouldAsk,
} from './prompt';
import { deliverFeedback, feedbackInsert, type FeedbackInsert } from './send';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('feedback prompt timing', () => {
  const now = 1_700_000_000_000;

  it('asks only after a Live session of at least 2 minutes', () => {
    expect(FEEDBACK_MIN_MS).toBe(2 * 60 * 1000);
    expect(sessionShouldAsk(FEEDBACK_MIN_MS - 1, null, now)).toBe(false);
    expect(sessionShouldAsk(FEEDBACK_MIN_MS, null, now)).toBe(true);
    expect(sessionShouldAsk(10 * 60 * 1000, null, now)).toBe(true);
    expect(sessionShouldAsk(Number.NaN, null, now)).toBe(false);
  });

  it('asks at most once per 7 days', () => {
    expect(FEEDBACK_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(sessionShouldAsk(FEEDBACK_MIN_MS, now - FEEDBACK_COOLDOWN_MS + 1, now)).toBe(
      false,
    );
    expect(sessionShouldAsk(FEEDBACK_MIN_MS, now - FEEDBACK_COOLDOWN_MS, now)).toBe(true);
    expect(sessionShouldAsk(FEEDBACK_MIN_MS, now, now)).toBe(false);
  });

  it('treats a missing or junk last-shown time as never shown', () => {
    expect(readLastShown(null)).toBeNull();
    expect(readLastShown('')).toBeNull();
    expect(readLastShown('soon')).toBeNull();
    expect(readLastShown('-1')).toBeNull();
    expect(readLastShown('42')).toBe(42);
    expect(sessionShouldAsk(FEEDBACK_MIN_MS, readLastShown('nope'), now)).toBe(true);
  });

  it('measures one continuous live stretch and ignores a stop with no start', () => {
    const started = noteLive({ startedAt: null }, true, 1_000);
    expect(started.endedMs).toBeNull();
    const still = noteLive(started.clock, true, 5_000);
    expect(still.clock.startedAt).toBe(1_000);
    expect(still.endedMs).toBeNull();
    const ended = noteLive(still.clock, false, 1_000 + FEEDBACK_MIN_MS);
    expect(ended.endedMs).toBe(FEEDBACK_MIN_MS);
    expect(ended.clock.startedAt).toBeNull();
    expect(noteLive(ended.clock, false, 9_000).endedMs).toBeNull();
  });
});

describe('feedback row', () => {
  it('stores a thumbs rating, an optional note, the usage session id, and a safe path', () => {
    const row = feedbackInsert({
      rating: 'up',
      message: '  The outline was hard to see.  ',
      sessionId: SESSION,
      page: '/live?pose=sit#access_token=secret',
    });
    expect(row).toEqual({
      rating: 'up',
      message: 'The outline was hard to see.',
      anon_session: SESSION,
      page: '/live',
    });
    expect(Object.keys(row ?? {}).sort()).toEqual([
      'anon_session',
      'message',
      'page',
      'rating',
    ]);
  });

  it('sends a blank note as null and cuts a long note at 1000 characters', () => {
    expect(feedbackMessage('   ')).toBeNull();
    expect(feedbackMessage('a'.repeat(FEEDBACK_MAX_CHARS + 40))?.length).toBe(
      FEEDBACK_MAX_CHARS,
    );
    expect(
      feedbackInsert({
        rating: 'down',
        message: '  ',
        sessionId: SESSION,
        page: '/settings',
      })?.message,
    ).toBeNull();
  });

  it('drops a bad rating, an email-shaped id, and a path that is not a short route', () => {
    expect(
      feedbackInsert({
        rating: 'maybe',
        message: 'hi',
        sessionId: SESSION,
        page: '/settings',
      }),
    ).toBeNull();
    expect(
      feedbackInsert({
        rating: 'up',
        message: 'hi',
        sessionId: 'maya@example.com',
        page: '/settings',
      }),
    ).toBeNull();
    expect(
      feedbackInsert({
        rating: 'down',
        message: 'hi',
        sessionId: SESSION,
        page: 'https://deskzenapp.com/live',
      })?.page,
    ).toBeNull();
  });

  it('reuses the anonymous session id from the usage counter', () => {
    const storage = memory();
    const sent: UsageInsert[] = [];
    createUsageTracker({
      storage,
      send: (row) => sent.push(row),
      newSessionId: () => SESSION,
    }).track('live_started', '/live', 1);
    expect(sent[0]?.anon_session).toBe(SESSION);
    expect(anonSessionId(storage, () => 'ffffffff-ffff-4fff-8fff-ffffffffffff')).toBe(
      SESSION,
    );

    storage.setItem('deskzen.usage.session', 'maya@example.com');
    expect(anonSessionId(storage, () => SESSION)).toBe(SESSION);
    expect(storage.getItem('deskzen.usage.session')).toBe(SESSION);
  });

  it('inserts only the four allowed fields and reports a failed save', async () => {
    const seen: FeedbackInsert[] = [];
    const ok = await deliverFeedback(
      {
        rating: 'down',
        message: 'Pause is easy to miss',
        page: '/live?email=maya@example.com',
      },
      {
        sessionId: SESSION,
        insert: (row) => {
          seen.push(row);
          return Promise.resolve(true);
        },
      },
    );
    expect(ok).toBe(true);
    expect(seen).toEqual([
      {
        rating: 'down',
        message: 'Pause is easy to miss',
        anon_session: SESSION,
        page: '/live',
      },
    ]);

    const failed = await deliverFeedback(
      { rating: 'up', message: '', page: '/settings' },
      { sessionId: SESSION, insert: () => Promise.reject(new Error('offline')) },
    );
    expect(failed).toBe(false);
    expect(
      await deliverFeedback(
        { rating: 'love', message: 'hi', page: '/live' },
        { sessionId: SESSION, insert: () => Promise.resolve(true) },
      ),
    ).toBe(false);
  });
});

describe('feedback migration', () => {
  const sql = readFileSync(
    'supabase/migrations/20261116140000_anonymous_feedback.sql',
    'utf8',
  );

  it('creates an insert-only table with the same session and path checks as usage events', () => {
    expect(sql).toContain('create table public.feedback');
    expect(sql).toContain("rating in ('up', 'down')");
    expect(sql).toContain('char_length(message) <= 1000');
    expect(sql).toContain(
      "anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'",
    );
    expect(sql).toContain("page ~ '^/[a-z0-9/_-]{0,79}$'");
    expect(sql.toLowerCase()).toContain('enable row level security');
    expect(sql.toLowerCase()).toContain(
      'revoke all on table public.feedback from public, anon, authenticated',
    );
    expect(sql.toLowerCase()).toContain(
      'grant insert (rating, message, anon_session, page) on table public.feedback to anon',
    );
    expect(sql.toLowerCase()).toContain(
      'grant insert (rating, message, anon_session, page) on table public.feedback to authenticated',
    );
    expect(sql).toContain('to anon');
    expect(sql).toContain('to authenticated');
    expect(sql.toLowerCase()).not.toContain('grant select');
    expect(sql).not.toMatch(/for\s+select/i);
    expect(sql).not.toMatch(/for\s+update/i);
    expect(sql).not.toMatch(/for\s+delete/i);
    expect(sql).toMatch(/for\s+insert/i);
    expect(sql).not.toContain('service_role');
  });

  it('does not read the camera in the feedback client', () => {
    const source = ['src/lib/feedback', 'src/features/feedback']
      .flatMap((dir) =>
        readdirSync(dir)
          .filter((name) => !name.endsWith('.test.ts'))
          .map((name) => readFileSync(`${dir}/${name}`, 'utf8')),
      )
      .join('\n');
    expect(source).not.toMatch(/getUserMedia|toDataURL|captureStream|snapshot/i);
    expect(source).toContain('rating: row.rating');
    expect(source).toContain('anon_session: row.anon_session');
    expect(source).not.toContain('account_id');
  });
});
