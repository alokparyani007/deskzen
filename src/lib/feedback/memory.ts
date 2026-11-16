import { isTapQuestion, type TapQuestionKey } from './questions';

export const FEEDBACK_SHOWN_KEY = 'deskzen.feedback.shownAt';
export const FEEDBACK_ANSWERED_KEY = 'deskzen.feedback.answered';
export const FEEDBACK_ROTATE_KEY = 'deskzen.feedback.rotate';

export type FeedbackMemory = {
  shownAt: number | null;
  answered: TapQuestionKey[];
  rotate: number;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const EMPTY: FeedbackMemory = { shownAt: null, answered: [], rotate: 0 };

export function readFeedbackMemory(storage: Pick<Storage, 'getItem'>): FeedbackMemory {
  try {
    const shownRaw = storage.getItem(FEEDBACK_SHOWN_KEY);
    const shownNum = shownRaw === null || shownRaw === '' ? null : Number(shownRaw);
    const answered: TapQuestionKey[] = [];
    const rawAnswered = storage.getItem(FEEDBACK_ANSWERED_KEY);
    if (rawAnswered) {
      const parsed: unknown = JSON.parse(rawAnswered);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (
            typeof item === 'string' &&
            isTapQuestion(item) &&
            !answered.includes(item)
          ) {
            answered.push(item);
          }
        }
      }
    }
    const rotateRaw = storage.getItem(FEEDBACK_ROTATE_KEY);
    const rotateNum = rotateRaw === null ? 0 : Number(rotateRaw);
    return {
      shownAt: shownNum !== null && Number.isFinite(shownNum) ? shownNum : null,
      answered,
      rotate: Number.isFinite(rotateNum) && rotateNum >= 0 ? Math.floor(rotateNum) : 0,
    };
  } catch {
    return EMPTY;
  }
}

/** Called when the card is shown. Dismissing later still counts, because the time is already stored. */
export function markFeedbackShown(
  storage: StorageLike,
  now: number,
  rotate: number,
): void {
  storage.setItem(FEEDBACK_SHOWN_KEY, String(now));
  storage.setItem(FEEDBACK_ROTATE_KEY, String(Math.max(0, Math.floor(rotate))));
}

/** Remember a tap question this browser answered. Skips are not recorded. */
export function markQuestionAnswered(
  storage: StorageLike,
  question: TapQuestionKey,
): void {
  const memory = readFeedbackMemory(storage);
  if (memory.answered.includes(question)) return;
  storage.setItem(FEEDBACK_ANSWERED_KEY, JSON.stringify([...memory.answered, question]));
}
