import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { FEEDBACK_MESSAGE_MAX, type FeedbackRating } from '../../lib/feedback/prompt';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

export type FeedbackCardProps = {
  rating: FeedbackRating | null;
  message: string;
  sending: boolean;
  sent: boolean;
  error: string | null;
  onRating: (rating: FeedbackRating) => void;
  onMessage: (value: string) => void;
  onSend: () => void;
  onDismiss: () => void;
};

/** Small dark card. Shown only after a long enough Live session. */
export function FeedbackCard({
  rating,
  message,
  sending,
  sent,
  error,
  onRating,
  onMessage,
  onSend,
  onDismiss,
}: FeedbackCardProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Dismiss feedback"
        onClick={onDismiss}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-print/50 bg-stage p-5 text-white shadow-[0_16px_50px_rgb(0_0_0/0.45)] outline-none"
      >
        {sent ? (
          <div className="flex flex-col items-start gap-4">
            <p id="feedback-title" className="text-lg font-semibold" role="status">
              Thanks, this really helps.
            </p>
            <button
              type="button"
              className={`inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-callout ${focus}`}
              onClick={onDismiss}
            >
              Close
            </button>
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSend();
            }}
          >
            <h2 id="feedback-title" className="text-lg font-semibold">
              How was DeskZen?
            </h2>
            <div className="mt-4 flex gap-3" role="group" aria-label="Thumbs rating">
              <ThumbButton
                label="Thumbs up"
                pressed={rating === 'up'}
                onClick={() => onRating('up')}
              >
                <ThumbsUp className="size-5" aria-hidden="true" />
              </ThumbButton>
              <ThumbButton
                label="Thumbs down"
                pressed={rating === 'down'}
                onClick={() => onRating('down')}
              >
                <ThumbsDown className="size-5" aria-hidden="true" />
              </ThumbButton>
            </div>
            <label
              htmlFor="feedback-note"
              className="mt-4 block text-sm font-semibold text-white"
            >
              What should we improve?
            </label>
            <p id="feedback-note-hint" className="mt-1 text-sm text-white/60">
              Optional. Up to 1,000 characters.
            </p>
            <textarea
              id="feedback-note"
              rows={3}
              autoComplete="off"
              maxLength={FEEDBACK_MESSAGE_MAX}
              value={message}
              aria-describedby="feedback-note-hint"
              placeholder="A sentence is plenty."
              className={`mt-2 w-full resize-y rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-base text-white placeholder:text-white/40 ${focus}`}
              onChange={(event) => onMessage(event.target.value)}
            />
            {error ? (
              <p className="mt-2 text-sm text-white" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className={`inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-callout disabled:opacity-40 ${focus}`}
                disabled={rating === null || sending}
              >
                {sending ? 'Sending' : 'Send'}
              </button>
              <button
                type="button"
                className={`inline-flex min-h-11 items-center text-sm font-semibold text-print underline underline-offset-2 ${focus}`}
                onClick={onDismiss}
              >
                No thanks
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ThumbButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      className={`inline-flex min-h-11 min-w-11 flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${focus} ${
        pressed
          ? 'border-print bg-print/20 text-white'
          : 'border-white/15 bg-white/5 text-white/80 hover:text-white'
      }`}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
