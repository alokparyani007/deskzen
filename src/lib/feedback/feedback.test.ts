import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FeedbackCard } from '../../features/feedback/FeedbackCard';
import { createAnonSessionId, isAnonSessionId } from '../usage/events';
import {
  FEEDBACK_GAP_MS,
  FEEDBACK_MESSAGE_MAX,
  FEEDBACK_MIN_LIVE_MS,
  FEEDBACK_SHOWN_KEY,
  decideFeedback,
  feedbackAnonSession,
  feedbackDue,
  prepareFeedback,
} from './prompt';
import { feedbackClientOptions, sendFeedback, type FeedbackSender } from './send';
import type { FeedbackInsert } from './prompt';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

function card(props: Partial<Parameters<typeof FeedbackCard>[0]> = {}): string {
  return renderToString(
    createElement(FeedbackCard, {
      rating: null,
      message: '',
      sending: false,
      sent: false,
      error: null,
      onRating: () => {},
      onMessage: () => {},
      onSend: () => {},
      onDismiss: () => {},
      ...props,
    }),
  ).replace(/<!-- -->/g, '');
}

describe('feedback prompt', () => {
  it('asks only after two minutes, and at most once a week', () => {
    expect(FEEDBACK_MIN_LIVE_MS).toBe(2 * 60 * 1000);
    expect(FEEDBACK_GAP_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(
      feedbackDue({ liveMs: FEEDBACK_MIN_LIVE_MS - 1, lastShownAt: null, now: 1 }),
    ).toBe(false);
    expect(feedbackDue({ liveMs: FEEDBACK_MIN_LIVE_MS, lastShownAt: null, now: 1 })).toBe(
      true,
    );

    const storage = memory();
    const short = decideFeedback({
      liveMs: FEEDBACK_MIN_LIVE_MS - 1,
      now: 5_000,
      page: '/live',
      storage,
    });
    expect(short).toEqual({ show: false });
    expect(storage.getItem(FEEDBACK_SHOWN_KEY)).toBeNull();

    const first = decideFeedback({
      liveMs: FEEDBACK_MIN_LIVE_MS,
      now: 10_000,
      page: '/live?email=maya@example.com#access_token=secret',
      storage,
    });
    expect(first).toEqual({ show: true, page: '/live' });
    expect(storage.getItem(FEEDBACK_SHOWN_KEY)).toBe('10000');

    const again = decideFeedback({
      liveMs: 10 * 60 * 1000,
      now: 10_000 + FEEDBACK_GAP_MS - 1,
      page: '/live',
      storage,
    });
    expect(again).toEqual({ show: false });

    const nextWeek = decideFeedback({
      liveMs: FEEDBACK_MIN_LIVE_MS,
      now: 10_000 + FEEDBACK_GAP_MS,
      page: '/Live',
      storage,
    });
    expect(nextWeek).toEqual({ show: true, page: null });
  });

  it('does not ask when the shown time cannot be saved', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(
      decideFeedback({ liveMs: FEEDBACK_MIN_LIVE_MS, now: 1, page: '/live', storage }),
    ).toEqual({ show: false });
    expect(
      decideFeedback({
        liveMs: FEEDBACK_MIN_LIVE_MS,
        now: 1,
        page: '/live',
        storage: null,
      }),
    ).toEqual({
      show: false,
    });
  });

  it('reuses the usage counter id and stores only the four allowed fields', () => {
    const storage = memory();
    storage.setItem('deskzen.usage.session', 'maya@example.com');
    expect(feedbackAnonSession(storage, () => SESSION)).toBe(SESSION);
    storage.setItem('deskzen.usage.session', SESSION);
    expect(feedbackAnonSession(storage, () => 'nope')).toBe(SESSION);
    expect(isAnonSessionId(feedbackAnonSession(null, createAnonSessionId))).toBe(true);

    const row = prepareFeedback({
      rating: 'up',
      message: '  Shorter nudges.  ',
      anonSession: SESSION,
      page: '/live?pose=sit',
    });
    expect(row).toEqual({
      rating: 'up',
      message: 'Shorter nudges.',
      anon_session: SESSION,
      page: '/live',
    });
    expect(Object.keys(row ?? {}).sort()).toEqual([
      'anon_session',
      'message',
      'page',
      'rating',
    ]);

    expect(
      prepareFeedback({
        rating: 'down',
        message: '   ',
        anonSession: SESSION,
        page: null,
      })?.message,
    ).toBe(null);
    expect(
      prepareFeedback({ rating: null, message: '', anonSession: SESSION, page: '/live' }),
    ).toBeNull();
    expect(
      prepareFeedback({
        rating: 'up',
        message: 'x'.repeat(FEEDBACK_MESSAGE_MAX + 1),
        anonSession: SESSION,
        page: '/live',
      }),
    ).toBeNull();
    expect(
      prepareFeedback({
        rating: 'up',
        message: 'x'.repeat(FEEDBACK_MESSAGE_MAX),
        anonSession: SESSION,
        page: '/live',
      })?.message,
    ).toHaveLength(FEEDBACK_MESSAGE_MAX);
    expect(
      prepareFeedback({
        rating: 'yes',
        message: '',
        anonSession: SESSION,
        page: '/live',
      }),
    ).toBeNull();
    expect(
      prepareFeedback({
        rating: 'up',
        message: '',
        anonSession: 'maya@example.com',
        page: '/live',
      }),
    ).toBeNull();
  });

  it('sends the row and stays quiet when the insert fails', async () => {
    const row: FeedbackInsert = {
      rating: 'down',
      message: null,
      anon_session: SESSION,
      page: '/live',
    };
    const sent: FeedbackInsert[] = [];
    const send: FeedbackSender = (next) => {
      sent.push(next);
    };
    await expect(sendFeedback(row, send)).resolves.toBe(true);
    expect(sent).toEqual([row]);
    await expect(
      sendFeedback(row, () => {
        throw new Error('offline');
      }),
    ).resolves.toBe(false);
    await expect(sendFeedback(row)).resolves.toBe(false);
  });

  it('keeps the feedback client anonymous', () => {
    const options = feedbackClientOptions();
    expect(options.auth?.persistSession).toBe(false);
    expect(options.auth?.autoRefreshToken).toBe(false);
    expect(options.auth?.detectSessionInUrl).toBe(false);
    expect(options.auth?.storageKey).toBe('deskzen.feedback.nosession');
    expect(options.global?.headers).toMatchObject({ Prefer: 'return=minimal' });
    expect(JSON.stringify(options)).not.toContain('service_role');
  });

  it('matches the insert checks in the migration', () => {
    const sql = readFileSync(
      'supabase/migrations/20261116160000_anonymous_feedback.sql',
      'utf8',
    );
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
      'grant insert (rating, message, anon_session, page) on table public.feedback to anon, authenticated',
    );
    expect(sql.toLowerCase()).not.toContain('grant select');
    expect(sql).not.toMatch(/for\s+select/i);
    expect(sql).not.toMatch(/for\s+update/i);
    expect(sql).not.toMatch(/for\s+delete/i);
    expect(sql.match(/for\s+insert/gi)?.length).toBe(2);
    expect(sql).toContain('to anon');
    expect(sql).toContain('to authenticated');
    expect(sql).not.toContain('service_role');
  });
});

describe('feedback card', () => {
  it('asks for a thumb and an optional note, with a clear dismiss', () => {
    const html = card();
    expect(html).toContain('How was DeskZen?');
    expect(html).toContain('aria-label="Thumbs up"');
    expect(html).toContain('aria-label="Thumbs down"');
    expect(html).toContain('What should we improve?');
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain('>Send<');
    expect(html).toContain('No thanks');
    expect(html).toContain('aria-label="Dismiss feedback"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('disabled=""');
    expect(html).toContain('bg-brand');
    expect(html).toContain('hover:bg-callout');
    expect(html).not.toContain('type="email"');
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toMatch(/\b(cure|diagnose|treat|injury)\b/);
  });

  it('shows thanks after a rating is sent', () => {
    const html = card({ rating: 'up', sent: true });
    expect(html).toContain('Thanks, this really helps.');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('What should we improve?');
    expect(html).toContain('border-print');
  });
});
