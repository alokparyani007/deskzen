import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  FEEDBACK_SHOWN_KEY,
  readLastShown,
  sessionShouldAsk,
} from '../../lib/feedback/prompt';
import { submitFeedback } from '../../lib/feedback/send';
import { FeedbackCard } from './FeedbackCard';
import { FeedbackContext } from './feedback-context';

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(0);

  const openCard = useCallback(() => {
    setToken((n) => n + 1);
    setOpen(true);
  }, []);

  const onLiveEnded = useCallback((durationMs: number) => {
    try {
      const now = Date.now();
      const last = readLastShown(window.localStorage.getItem(FEEDBACK_SHOWN_KEY));
      if (!sessionShouldAsk(durationMs, last, now)) return;
      window.localStorage.setItem(FEEDBACK_SHOWN_KEY, String(now));
      setToken((n) => n + 1);
      setOpen(true);
    } catch {
      // A prompt must never break Live view.
    }
  }, []);

  const api = useMemo(() => ({ open: openCard, onLiveEnded }), [openCard, onLiveEnded]);

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {open ? (
        <FeedbackCard
          key={token}
          onDismiss={() => setOpen(false)}
          onSubmit={({ rating, message }) =>
            submitFeedback({ rating, message, page: window.location.pathname })
          }
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}
