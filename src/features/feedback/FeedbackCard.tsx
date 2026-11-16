import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { FEEDBACK_MAX_CHARS } from '../../lib/feedback/prompt';

const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-print';

export type FeedbackDraft = { rating: 'up' | 'down'; message: string };

/** Dark card: thumbs, an optional note, Send, and a clear dismiss. The dialog traps focus. */
export function FeedbackCard({
  onDismiss,
  onSubmit,
  initialSent = false,
}: {
  onDismiss: () => void;
  onSubmit: (draft: FeedbackDraft) => Promise<boolean>;
  /** Test hook so the thanks state can render without a click. */
  initialSent?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(initialSent);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog.open) return;
      const items = [...dialog.querySelectorAll<HTMLElement>('button, textarea, a[href], input')].filter(
        (item) => !item.hasAttribute('disabled'),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', onKey);
    return () => {
      dialog.removeEventListener('keydown', onKey);
      if (dialog.open) dialog.close();
    };
  }, []);

  async function send(): Promise<void> {
    if (!rating || pending) return;
    setPending(true);
    setError(null);
    const ok = await onSubmit({ rating, message });
    setPending(false);
    if (ok) setSent(true);
    else setError("We couldn't send that. Please try again.");
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-white/10 bg-stage p-5 text-white shadow-2xl backdrop:bg-black/70"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      {sent ? (
        <div>
          <h2
            id={titleId}
            className="text-xl font-semibold text-print"
            role="status"
            aria-live="polite"
          >
            Thanks, this really helps.
          </h2>
          <button
            type="button"
            autoFocus
            className={`mt-5 min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-callout ${focus}`}
            onClick={onDismiss}
          >
            Close
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <h2 id={titleId} className="text-xl font-semibold">
            How was DeskZen?
          </h2>
          <div
            className="mt-4 grid grid-cols-2 gap-2"
            role="group"
            aria-label="Thumbs rating"
          >
            <Thumb
              pressed={rating === 'up'}
              label="Thumbs up"
              onClick={() => setRating('up')}
            >
              <ThumbsUp className="size-5" aria-hidden="true" />
            </Thumb>
            <Thumb
              pressed={rating === 'down'}
              label="Thumbs down"
              onClick={() => setRating('down')}
            >
              <ThumbsDown className="size-5" aria-hidden="true" />
            </Thumb>
          </div>
          <label htmlFor={noteId} className="mt-4 block text-sm font-medium">
            What should we improve?
          </label>
          <textarea
            id={noteId}
            name="message"
            maxLength={FEEDBACK_MAX_CHARS}
            rows={4}
            value={message}
            placeholder="Optional"
            className={`mt-1 w-full resize-y rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-base text-white placeholder:text-white/40 ${focus}`}
            onChange={(event) => setMessage(event.target.value)}
          />
          <p className="mt-1 text-xs text-white/55">
            {message.length} / {FEEDBACK_MAX_CHARS}. Optional. No name or email.
          </p>
          {error ? (
            <p className="mt-2 text-sm text-rose-200" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="submit"
              disabled={!rating || pending}
              className={`min-h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-callout disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
            >
              {pending ? 'Sending' : 'Send'}
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-xl text-sm font-semibold text-print underline underline-offset-4 ${focus}`}
              onClick={onDismiss}
            >
              No thanks
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

function Thumb({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold ${focus} ${pressed ? 'border-print text-print' : 'border-white/15 text-white'}`}
      onClick={onClick}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
