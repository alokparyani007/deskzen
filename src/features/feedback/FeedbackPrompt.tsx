import { useCallback, useEffect, useState } from 'react';
import { FeedbackCard } from './FeedbackCard';
import { feedbackRow } from '../../lib/feedback/row';
import { sendFeedback } from '../../lib/feedback/send';
import {
  FEEDBACK_DELAY_MS,
  feedbackDue,
  planFeedback,
  type TapQuestionKey,
} from '../../lib/feedback/questions';
import {
  markFeedbackShown,
  markQuestionAnswered,
  readFeedbackMemory,
} from '../../lib/feedback/memory';
import { createAnonSessionId, safeUsagePath } from '../../lib/usage/events';
import { ensureAnonSessionId } from '../../lib/usage/track';

type Session = {
  feedbackId: string;
  anonSession: string;
  questions: [TapQuestionKey, TapQuestionKey];
  page: string | null;
};

function openFeedback(markShown: boolean): Session | null {
  try {
    const memory = readFeedbackMemory(window.localStorage);
    if (markShown && !feedbackDue(memory.shownAt, Date.now())) return null;
    const plan = planFeedback(memory);
    if (markShown) markFeedbackShown(window.localStorage, Date.now(), plan.rotate);
    const anonSession = ensureAnonSessionId(window.sessionStorage);
    if (!anonSession) return null;
    return {
      feedbackId: createAnonSessionId(),
      anonSession,
      questions: plan.questions,
      page: safeUsagePath(window.location.pathname),
    };
  } catch {
    return null;
  }
}

export function FeedbackPrompt({
  active,
  preview,
  place = 'bottom',
}: {
  active: boolean;
  preview: boolean;
  place?: 'top' | 'bottom';
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!active || dismissed || session) return;
    if (!preview) {
      try {
        if (!feedbackDue(readFeedbackMemory(window.localStorage).shownAt, Date.now()))
          return;
      } catch {
        return;
      }
    }
    const id = window.setTimeout(
      () => {
        setSession((current) => current ?? openFeedback(!preview));
      },
      preview ? 0 : FEEDBACK_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [active, preview, dismissed, session]);

  const close = useCallback(() => setDismissed(true), []);

  const save = useCallback(
    (question: TapQuestionKey | 'comment', answer: string) => {
      if (!session) return;
      if (question !== 'comment') markQuestionAnswered(window.localStorage, question);
      const row = feedbackRow({
        feedbackId: session.feedbackId,
        anonSession: session.anonSession,
        question,
        answer,
        page: session.page,
      });
      if (row) void sendFeedback(row);
    },
    [session],
  );

  if (!active || dismissed || !session) return null;

  return (
    <FeedbackCard
      questions={session.questions}
      onAnswer={(question, answer) => save(question, answer)}
      onComment={(text) => save('comment', text)}
      onClose={close}
      place={place}
    />
  );
}
