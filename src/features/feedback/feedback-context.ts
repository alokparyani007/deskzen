import { createContext, useContext } from 'react';

export type FeedbackApi = {
  /** Settings. Always opens the card, even inside the 7 day window. */
  open: () => void;
  /** After a Live session stops. Shows the card at most once per 7 days. */
  onLiveEnded: (durationMs: number) => void;
};

export const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const value = useContext(FeedbackContext);
  if (!value) throw new Error('Feedback is only available in the app');
  return value;
}
