import { isAnonSessionId, safeUsagePath } from '../usage/events';
import {
  COMMENT_KEY,
  isAllowedAnswer,
  isFeedbackQuestion,
  type FeedbackQuestion,
} from './questions';

/** The only fields the browser may insert. One row is one answer. */
export type FeedbackRow = {
  feedback_id: string;
  anon_session: string;
  question: FeedbackQuestion;
  answer: string;
  page: string | null;
};

export function feedbackRow(input: {
  feedbackId: string;
  anonSession: string;
  question: string;
  answer: string;
  page: string | null | undefined;
}): FeedbackRow | null {
  if (!isAnonSessionId(input.feedbackId) || !isAnonSessionId(input.anonSession))
    return null;
  if (!isFeedbackQuestion(input.question)) return null;
  const answer = input.question === COMMENT_KEY ? input.answer.trim() : input.answer;
  if (!isAllowedAnswer(input.question, answer)) return null;
  return {
    feedback_id: input.feedbackId,
    anon_session: input.anonSession,
    question: input.question,
    answer,
    page: safeUsagePath(input.page),
  };
}
