export type AskStep = 0 | 1 | 2;

export type FeedbackPhase =
  { kind: 'ask'; step: AskStep } | { kind: 'thanks' } | { kind: 'closed' };

export type FeedbackAction =
  { type: 'answer' } | { type: 'skip' } | { type: 'send' } | { type: 'close' };

/**
 * One question on screen at a time.
 * A tap answer or Skip moves forward. Send on the note step says thanks.
 * Skip on the note, or Close at any step, leaves whatever was already saved.
 */
export function reduceFeedback(
  state: FeedbackPhase,
  action: FeedbackAction,
): FeedbackPhase {
  if (action.type === 'close') return { kind: 'closed' };
  if (state.kind !== 'ask') return state;
  if (action.type === 'send') return state.step === 2 ? { kind: 'thanks' } : state;
  if (state.step === 0) return { kind: 'ask', step: 1 };
  if (state.step === 1) return { kind: 'ask', step: 2 };
  if (action.type === 'skip') return { kind: 'closed' };
  return state;
}
