import { useCallback, useState, useSyncExternalStore } from 'react';
import {
  feedbackAnonSession,
  prepareFeedback,
  type FeedbackRating,
} from '../../lib/feedback/prompt';
import { sendFeedback } from '../../lib/feedback/send';
import { FeedbackCard } from './FeedbackCard';
import { dismissFeedback, getFeedbackOffer, subscribeFeedback } from './offer';

const SEND_ERROR = "Couldn't send that. You can try again.";

function browserSession(): Pick<Storage, 'getItem'> | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** The prompt itself. Mounted once in the app shell, including after Live view closes. */
export function FeedbackPrompt() {
  const offer = useSyncExternalStore(subscribeFeedback, getFeedbackOffer, () => null);
  if (!offer) return null;
  return <FeedbackForm page={offer.page} />;
}

function FeedbackForm({ page }: { page: string | null }) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDismiss = useCallback(() => dismissFeedback(), []);

  async function onSend(): Promise<void> {
    if (rating === null) {
      setError('Pick a thumb to send.');
      return;
    }
    const row = prepareFeedback({
      rating,
      message,
      anonSession: feedbackAnonSession(browserSession()),
      page,
    });
    if (!row) {
      setError('Keep the note to 1,000 characters.');
      return;
    }
    setSending(true);
    setError(null);
    const ok = await sendFeedback(row);
    setSending(false);
    if (ok) setSent(true);
    else setError(SEND_ERROR);
  }

  return (
    <FeedbackCard
      rating={rating}
      message={message}
      sending={sending}
      sent={sent}
      error={error}
      onRating={setRating}
      onMessage={setMessage}
      onSend={() => void onSend()}
      onDismiss={onDismiss}
    />
  );
}
