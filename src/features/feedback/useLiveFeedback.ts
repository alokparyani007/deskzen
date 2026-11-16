import { useEffect } from 'react';
import { decideFeedback } from '../../lib/feedback/prompt';
import { openFeedback } from './offer';

function browserLocalStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * When Live view's camera stops, maybe ask for feedback.
 * Pausing or leaving ends the session. A new camera-on stretch starts the clock over.
 */
export function useLiveFeedback(live: boolean, page: string): void {
  useEffect(() => {
    if (!live) return;
    const started = Date.now();
    return () => {
      const now = Date.now();
      const decision = decideFeedback({
        liveMs: now - started,
        now,
        page,
        storage: browserLocalStorage(),
      });
      if (decision.show) openFeedback(decision.page);
    };
  }, [live, page]);
}
