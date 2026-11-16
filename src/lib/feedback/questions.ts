import { LIVE_FIVE_MIN_MS } from '../usage/events';

export const COMMENT_KEY = 'comment' as const;
export const COMMENT_MAX = 1000;

/** How long Live view must stay active before the card appears. */
export const FEEDBACK_DELAY_MS = LIVE_FIVE_MIN_MS;

/** Minimum time between cards in one browser. */
export const FEEDBACK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export const TAP_QUESTIONS = {
  helping: {
    prompt: 'Is DeskZen helping?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'a_little', label: 'A little' },
      { value: 'not_really', label: 'Not really' },
    ],
  },
  wish: {
    prompt: 'What would you like most?',
    options: [
      { value: 'better_alerts', label: 'Better slouch alerts' },
      { value: 'fewer_reminders', label: 'Fewer reminders' },
      { value: 'easier_setup', label: 'Easier setup' },
      { value: 'other', label: 'Something else' },
    ],
  },
  source: {
    prompt: 'How did you find DeskZen?',
    options: [
      { value: 'tiktok', label: 'TikTok' },
      { value: 'instagram', label: 'Instagram' },
      { value: 'reddit', label: 'Reddit' },
      { value: 'google', label: 'Google' },
      { value: 'friend', label: 'A friend' },
      { value: 'other', label: 'Other' },
    ],
  },
  frequency: {
    prompt: 'How often do you use it?',
    options: [
      { value: 'every_day', label: 'Every day' },
      { value: 'a_few_times_a_week', label: 'A few times a week' },
      { value: 'first_time', label: 'First time' },
    ],
  },
  setup: {
    prompt: 'Was setup easy?',
    options: [
      { value: 'easy', label: 'Easy' },
      { value: 'okay', label: 'Okay' },
      { value: 'confusing', label: 'Confusing' },
    ],
  },
  alerts: {
    prompt: 'Are the slouch alerts right?',
    options: [
      { value: 'just_right', label: 'Just right' },
      { value: 'too_many', label: 'Too many' },
      { value: 'too_few', label: 'Too few' },
    ],
  },
  recommend: {
    prompt: 'Would you tell a friend about DeskZen?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'maybe', label: 'Maybe' },
      { value: 'no', label: 'No' },
    ],
  },
  pay: {
    prompt: 'Would you pay for extra features?',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'maybe', label: 'Maybe' },
      { value: 'no', label: 'No' },
    ],
  },
} as const;

export type TapQuestionKey = keyof typeof TAP_QUESTIONS;
export type FeedbackQuestion = TapQuestionKey | typeof COMMENT_KEY;

/** Unanswered questions are asked in this order. Source and setup lead, for a new browser. */
export const TAP_ORDER: readonly TapQuestionKey[] = [
  'source',
  'setup',
  'helping',
  'wish',
  'frequency',
  'alerts',
  'recommend',
  'pay',
];

/** After every tap question has an answer, helping pairs with the next one of these. */
export const ROTATE_OTHERS: readonly TapQuestionKey[] = [
  'wish',
  'source',
  'frequency',
  'setup',
  'alerts',
  'recommend',
  'pay',
];

export function isTapQuestion(value: string): value is TapQuestionKey {
  return Object.prototype.hasOwnProperty.call(TAP_QUESTIONS, value);
}

export function isFeedbackQuestion(value: string): value is FeedbackQuestion {
  return value === COMMENT_KEY || isTapQuestion(value);
}

export function isAllowedAnswer(question: FeedbackQuestion, answer: string): boolean {
  if (question === COMMENT_KEY) {
    const text = answer.trim();
    return text.length >= 1 && text.length <= COMMENT_MAX;
  }
  return TAP_QUESTIONS[question].options.some((option) => option.value === answer);
}

export function rotatePartner(index: number): TapQuestionKey {
  const size = ROTATE_OTHERS.length;
  const normalized = ((index % size) + size) % size;
  return ROTATE_OTHERS[normalized] ?? 'wish';
}

/**
 * Two tap questions for one popup.
 * Unanswered keys come first. A new browser gets source, then setup.
 * When every tap question has an answer, the pair is helping plus the next rotating question.
 */
export function planFeedback(input: { answered: readonly string[]; rotate: number }): {
  questions: [TapQuestionKey, TapQuestionKey];
  rotate: number;
} {
  const answered = new Set(input.answered.filter(isTapQuestion));
  const unanswered = TAP_ORDER.filter((key) => !answered.has(key));
  const first = unanswered[0];
  const second = unanswered[1];
  if (first && second) return { questions: [first, second], rotate: input.rotate };
  if (first) {
    const partner: TapQuestionKey =
      first === 'helping' ? rotatePartner(input.rotate) : 'helping';
    return { questions: [first, partner], rotate: input.rotate };
  }
  return {
    questions: ['helping', rotatePartner(input.rotate)],
    rotate: input.rotate + 1,
  };
}

export function feedbackDue(
  shownAt: number | null,
  now: number,
  cooldownMs = FEEDBACK_COOLDOWN_MS,
): boolean {
  if (shownAt === null || !Number.isFinite(shownAt)) return true;
  return now - shownAt >= cooldownMs;
}
