import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FeedbackCard } from '../../features/feedback/FeedbackCard';
import { reduceFeedback } from './flow';
import {
  FEEDBACK_ANSWERED_KEY,
  FEEDBACK_ROTATE_KEY,
  FEEDBACK_SHOWN_KEY,
  markFeedbackShown,
  markQuestionAnswered,
  readFeedbackMemory,
} from './memory';
import { feedbackPreviewFromSearch } from './preview';
import {
  COMMENT_MAX,
  FEEDBACK_COOLDOWN_MS,
  FEEDBACK_DELAY_MS,
  TAP_ORDER,
  TAP_QUESTIONS,
  feedbackDue,
  isAllowedAnswer,
  planFeedback,
} from './questions';
import { feedbackRow } from './row';
import { ensureAnonSessionId } from '../usage/track';

const SESSION = '123e4567-e89b-42d3-a456-426614174000';
const POPUP = '123e4567-e89b-42d3-a456-426614174001';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

function renderCard(
  questions: readonly [(typeof TAP_ORDER)[number], (typeof TAP_ORDER)[number]],
  start?: { kind: 'ask'; step: 0 | 1 | 2 } | { kind: 'thanks' },
): string {
  return renderToString(
    createElement(FeedbackCard, {
      questions,
      onAnswer: () => undefined,
      onComment: () => undefined,
      onClose: () => undefined,
      start,
    }),
  );
}

describe('feedback questions', () => {
  it('asks source and setup first for a new browser', () => {
    const plan = planFeedback({ answered: [], rotate: 0 });
    expect(plan.questions).toEqual(['source', 'setup']);
    expect(plan.rotate).toBe(0);
    expect(TAP_QUESTIONS.source.prompt).toBe('How did you find DeskZen?');
    expect(TAP_QUESTIONS.setup.prompt).toBe('Was setup easy?');
  });

  it('asks unanswered questions before repeating any', () => {
    expect(planFeedback({ answered: ['source', 'setup'], rotate: 4 }).questions).toEqual([
      'helping',
      'wish',
    ]);
    expect(planFeedback({ answered: ['email', 'source'], rotate: 0 }).questions).toEqual([
      'setup',
      'helping',
    ]);
    const almost = planFeedback({
      answered: TAP_ORDER.filter((key) => key !== 'pay'),
      rotate: 3,
    });
    expect(almost.questions).toEqual(['pay', 'helping']);
    expect(almost.rotate).toBe(3);
    const onlyHelping = planFeedback({
      answered: TAP_ORDER.filter((key) => key !== 'helping'),
      rotate: 1,
    });
    expect(onlyHelping.questions).toEqual(['helping', 'source']);
    expect(onlyHelping.rotate).toBe(1);
  });

  it('rotates helping plus one other after every tap question has an answer', () => {
    const first = planFeedback({ answered: TAP_ORDER, rotate: 0 });
    const second = planFeedback({ answered: TAP_ORDER, rotate: first.rotate });
    expect(first.questions).toEqual(['helping', 'wish']);
    expect(first.rotate).toBe(1);
    expect(second.questions).toEqual(['helping', 'source']);
    expect(second.rotate).toBe(2);
    const wrapped = planFeedback({ answered: TAP_ORDER, rotate: 7 });
    expect(wrapped.questions).toEqual(['helping', 'wish']);
  });

  it('waits seven days, and five minutes of Live view, between cards', () => {
    expect(FEEDBACK_DELAY_MS).toBe(5 * 60 * 1000);
    expect(FEEDBACK_COOLDOWN_MS).toBe(7 * 24 * 60 * 60 * 1000);
    const shown = 1_000;
    expect(feedbackDue(null, shown)).toBe(true);
    expect(feedbackDue(shown, shown + FEEDBACK_COOLDOWN_MS - 1)).toBe(false);
    expect(feedbackDue(shown, shown + FEEDBACK_COOLDOWN_MS)).toBe(true);
  });

  it('keeps prompts free of medical claims and em dashes', () => {
    const text = Object.values(TAP_QUESTIONS)
      .flatMap((question) => [
        question.prompt,
        ...question.options.map((option) => option.label),
      ])
      .join(' ');
    expect(text).not.toContain('\u2014');
    expect(text.toLowerCase()).not.toMatch(/\b(cure|diagnose|treat|prevent injury)\b/);
  });
});

describe('feedback memory', () => {
  it('stores the shown time when the card appears, and which questions were answered', () => {
    const storage = memory();
    const plan = planFeedback({ answered: [], rotate: 0 });
    markFeedbackShown(storage, 50_000, plan.rotate);
    markQuestionAnswered(storage, 'source');
    markQuestionAnswered(storage, 'source');
    storage.setItem(
      FEEDBACK_ANSWERED_KEY,
      JSON.stringify(['source', 'not-a-question', 'setup']),
    );
    const saved = readFeedbackMemory(storage);
    expect(saved.shownAt).toBe(50_000);
    expect(saved.answered).toEqual(['source', 'setup']);
    expect(saved.rotate).toBe(0);
    expect(storage.getItem(FEEDBACK_SHOWN_KEY)).toBe('50000');
    expect(feedbackDue(saved.shownAt, 50_000)).toBe(false);
  });

  it('ignores a broken store', () => {
    const storage = memory();
    storage.setItem(FEEDBACK_ANSWERED_KEY, '{');
    storage.setItem(FEEDBACK_ROTATE_KEY, '-2');
    storage.setItem(FEEDBACK_SHOWN_KEY, 'nope');
    expect(readFeedbackMemory(storage)).toEqual({
      shownAt: null,
      answered: [],
      rotate: 0,
    });
  });
});

describe('feedback rows', () => {
  it('reuses the usage counter session id', () => {
    const storage = memory();
    storage.setItem('deskzen.usage.session', 'maya@example.com');
    expect(ensureAnonSessionId(storage, () => SESSION)).toBe(SESSION);
    expect(storage.getItem('deskzen.usage.session')).toBe(SESSION);
    expect(ensureAnonSessionId(storage, () => POPUP)).toBe(SESSION);
  });

  it('inserts one row per answer, sharing a popup id, with no extra fields', () => {
    const helping = feedbackRow({
      feedbackId: POPUP,
      anonSession: SESSION,
      question: 'helping',
      answer: 'a_little',
      page: '/live?email=maya@example.com#token',
    });
    const note = feedbackRow({
      feedbackId: POPUP,
      anonSession: SESSION,
      question: 'comment',
      answer: '  Shorter nudges, please.  ',
      page: '/live',
    });
    expect(helping).toEqual({
      feedback_id: POPUP,
      anon_session: SESSION,
      question: 'helping',
      answer: 'a_little',
      page: '/live',
    });
    expect(note?.feedback_id).toBe(helping?.feedback_id);
    expect(note?.answer).toBe('Shorter nudges, please.');
    expect(Object.keys(helping ?? {}).sort()).toEqual([
      'anon_session',
      'answer',
      'feedback_id',
      'page',
      'question',
    ]);
    expect(JSON.stringify(helping)).not.toMatch(/email|account|landmark|snapshot|photo/i);
  });

  it('rejects answers that are not allowed for that question', () => {
    expect(isAllowedAnswer('helping', 'yes')).toBe(true);
    expect(isAllowedAnswer('helping', 'maybe')).toBe(false);
    expect(isAllowedAnswer('pay', 'maybe')).toBe(true);
    expect(isAllowedAnswer('source', 'tiktok')).toBe(true);
    const bad = feedbackRow({
      feedbackId: POPUP,
      anonSession: 'not-a-uuid',
      question: 'wish',
      answer: 'better_alerts',
      page: '/live',
    });
    expect(bad).toBeNull();
    expect(
      feedbackRow({
        feedbackId: POPUP,
        anonSession: SESSION,
        question: 'alerts',
        answer: 'sometimes',
        page: '/live',
      }),
    ).toBeNull();
    expect(
      feedbackRow({
        feedbackId: POPUP,
        anonSession: SESSION,
        question: 'comment',
        answer: '   ',
        page: '/live',
      }),
    ).toBeNull();
    expect(
      feedbackRow({
        feedbackId: POPUP,
        anonSession: SESSION,
        question: 'comment',
        answer: 'a'.repeat(COMMENT_MAX),
        page: '/Live',
      })?.page,
    ).toBeNull();
    expect(
      feedbackRow({
        feedbackId: POPUP,
        anonSession: SESSION,
        question: 'comment',
        answer: 'a'.repeat(COMMENT_MAX + 1),
        page: '/live',
      }),
    ).toBeNull();
  });
});

describe('feedback steps', () => {
  it('moves one question at a time, and keeps going only on answer, skip, or send', () => {
    expect(reduceFeedback({ kind: 'ask', step: 0 }, { type: 'answer' })).toEqual({
      kind: 'ask',
      step: 1,
    });
    expect(reduceFeedback({ kind: 'ask', step: 1 }, { type: 'skip' })).toEqual({
      kind: 'ask',
      step: 2,
    });
    expect(reduceFeedback({ kind: 'ask', step: 2 }, { type: 'send' })).toEqual({
      kind: 'thanks',
    });
    expect(reduceFeedback({ kind: 'ask', step: 2 }, { type: 'skip' })).toEqual({
      kind: 'closed',
    });
    expect(reduceFeedback({ kind: 'ask', step: 0 }, { type: 'close' })).toEqual({
      kind: 'closed',
    });
    expect(reduceFeedback({ kind: 'ask', step: 1 }, { type: 'send' })).toEqual({
      kind: 'ask',
      step: 1,
    });
    expect(reduceFeedback({ kind: 'thanks' }, { type: 'answer' })).toEqual({
      kind: 'thanks',
    });
  });

  it('shows one question, then the note, with skip, close, and step dots', () => {
    const first = renderCard(['source', 'setup']);
    expect(first).toContain('How did you find DeskZen?');
    expect(first).toContain('TikTok');
    expect(first).toContain('A friend');
    expect(first).toContain('>Skip<');
    expect(first).toContain('Close feedback');
    expect(first).toContain('1 of 3');
    expect(first).toContain('aria-pressed="false"');
    expect(first).toContain('hover:bg-callout');
    expect(first).toContain('bg-print');
    expect(first).not.toContain('Was setup easy?');
    expect(first).not.toContain('Anything else?');
    expect(first).not.toContain('>Send<');
    expect(first).not.toContain('\u2014');

    const note = renderCard(['source', 'setup'], { kind: 'ask', step: 2 });
    expect(note).toContain('Anything else?');
    expect(note).toContain('maxLength="1000"');
    expect(note).toContain('>Send<');
    expect(note).toContain('bg-brand');
    expect(note).toContain('hover:bg-callout');
    expect(note).toContain('disabled=""');
    expect(note).toContain('3 of 3');
    expect(note).not.toContain('How did you find DeskZen?');

    const thanks = renderCard(['helping', 'wish'], { kind: 'thanks' });
    expect(thanks).toContain('Thanks, this really helps.');
    expect(thanks).not.toContain('>Skip<');
  });

  it('cannot open early from a unit test', () => {
    expect(feedbackPreviewFromSearch('feedback=1')).toBe(false);
    expect(feedbackPreviewFromSearch('?feedback=1')).toBe(false);
  });
});

describe('feedback migration', () => {
  const sql = readFileSync(
    'supabase/migrations/20261116145000_in_use_feedback.sql',
    'utf8',
  );

  it('matches the question keys and allowed answers', () => {
    for (const key of [...TAP_ORDER, 'comment']) expect(sql).toContain(`'${key}'`);
    for (const question of Object.values(TAP_QUESTIONS)) {
      for (const option of question.options) expect(sql).toContain(`'${option.value}'`);
    }
    expect(sql).toContain('char_length(answer) between 1 and 1000');
    expect(sql).toContain('feedback_id uuid not null');
    expect(sql).toContain(
      "anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'",
    );
    expect(sql).toContain("page is null or page ~ '^/[a-z0-9/_-]{0,79}$'");
  });

  it('is insert-only for anon and authenticated', () => {
    const lower = sql.toLowerCase();
    expect(lower).toContain('enable row level security');
    expect(lower).toContain(
      'revoke all on table public.feedback from public, anon, authenticated',
    );
    expect(lower).toContain(
      'grant insert (feedback_id, anon_session, question, answer, page) on table public.feedback to anon',
    );
    expect(lower).toContain(
      'grant insert (feedback_id, anon_session, question, answer, page) on table public.feedback to authenticated',
    );
    expect(lower).toContain('to anon');
    expect(lower).toContain('to authenticated');
    expect(sql).toMatch(/for\s+insert/i);
    expect(lower).not.toContain('grant select');
    expect(sql).not.toMatch(/for\s+select/i);
    expect(sql).not.toMatch(/for\s+update/i);
    expect(sql).not.toMatch(/for\s+delete/i);
    expect(sql).not.toContain('service_role');
  });
});
