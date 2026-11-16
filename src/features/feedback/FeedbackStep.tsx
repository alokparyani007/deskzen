import {
  COMMENT_MAX,
  TAP_QUESTIONS,
  type TapQuestionKey,
} from '../../lib/feedback/questions';

export function FeedbackStep({
  question,
  pending,
  note,
  onNote,
  onChoose,
  onSkip,
  onSend,
}: {
  question: TapQuestionKey | null;
  pending: string | null;
  note: string;
  onNote: (value: string) => void;
  onChoose: (value: string) => void;
  onSkip: () => void;
  onSend: () => void;
}) {
  const spec = question ? TAP_QUESTIONS[question] : null;
  return (
    <div className="feedback-step" aria-live="polite">
      {spec ? (
        <>
          <h2 id="deskzen-feedback-title" className="text-base font-semibold">
            {spec.prompt}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {spec.options.map((option) => {
              const selected = pending === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={pending !== null}
                  className={`min-h-11 rounded-full px-3 text-sm font-semibold ${
                    selected
                      ? 'bg-print text-white'
                      : 'border border-white/25 text-white hover:bg-callout'
                  }`}
                  onClick={() => onChoose(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <label
            id="deskzen-feedback-title"
            htmlFor="deskzen-feedback-note"
            className="text-base font-semibold"
          >
            Anything else?
          </label>
          <textarea
            id="deskzen-feedback-note"
            value={note}
            maxLength={COMMENT_MAX}
            rows={2}
            placeholder="A sentence or two is plenty."
            className="mt-3 w-full resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/40"
            onChange={(event) => onNote(event.target.value)}
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            <p className="mr-auto text-xs text-white/50">
              {note.length}/{COMMENT_MAX}
            </p>
            <button
              type="button"
              className="inline-flex h-11 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white hover:bg-callout disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand"
              disabled={note.trim().length === 0}
              onClick={onSend}
            >
              Send
            </button>
          </div>
        </>
      )}
      <button
        type="button"
        className="mt-2 min-h-11 rounded px-1 text-sm font-medium text-white/70 hover:text-white hover:underline"
        onClick={onSkip}
      >
        Skip
      </button>
    </div>
  );
}
