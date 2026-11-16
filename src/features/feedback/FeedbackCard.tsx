import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { reduceFeedback, type FeedbackPhase } from '../../lib/feedback/flow';
import { COMMENT_MAX, type TapQuestionKey } from '../../lib/feedback/questions';
import { FeedbackStep } from './FeedbackStep';

const THANKS = 'Thanks, this really helps.';

export function FeedbackCard({
  questions,
  onAnswer,
  onComment,
  onClose,
  place = 'bottom',
  start = { kind: 'ask', step: 0 },
}: {
  questions: readonly [TapQuestionKey, TapQuestionKey];
  onAnswer: (question: TapQuestionKey, answer: string) => void;
  onComment: (text: string) => void;
  onClose: () => void;
  /** Top corner while the setup prompt is using the bottom of the camera. */
  place?: 'top' | 'bottom';
  start?: FeedbackPhase;
}) {
  const [phase, setPhase] = useState(start);
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const rootRef = useRef<HTMLElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    rootRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [onClose]);

  useEffect(() => {
    if (phase.kind !== 'thanks') return;
    const id = window.setTimeout(onClose, 2200);
    return () => window.clearTimeout(id);
  }, [phase, onClose]);

  const step = phase.kind === 'ask' ? phase.step : 2;
  const asking = phase.kind === 'ask';
  const question: TapQuestionKey | null =
    phase.kind === 'ask' && phase.step !== 2 ? questions[phase.step] : null;

  function clearTimer(): void {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function choose(value: string): void {
    if (!question || pending || !asking) return;
    setPending(value);
    onAnswer(question, value);
    clearTimer();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    timerRef.current = window.setTimeout(
      () => {
        timerRef.current = null;
        setPending(null);
        setPhase((current) => reduceFeedback(current, { type: 'answer' }));
      },
      reduceMotion ? 0 : 200,
    );
  }

  function skip(): void {
    clearTimer();
    const next = reduceFeedback(phase, { type: 'skip' });
    if (next.kind === 'closed') onClose();
    else setPhase(next);
  }

  function sendNote(): void {
    const text = note.trim();
    if (!text || text.length > COMMENT_MAX) return;
    onComment(text);
    setPhase(reduceFeedback(phase, { type: 'send' }));
  }

  return (
    <section
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-labelledby="deskzen-feedback-title"
      aria-describedby="deskzen-feedback-step"
      className={`absolute right-3 z-20 max-h-[min(18rem,46%)] w-[min(17.5rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-print/50 bg-stage p-3 text-white shadow-2xl ${place === 'top' ? 'top-3' : 'bottom-3'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p id="deskzen-feedback-step" className="text-xs font-medium text-print">
          {asking ? `${step + 1} of 3` : '3 of 3'}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className={`size-1.5 rounded-full ${asking && dot === step ? 'bg-print' : 'bg-white/30'}`}
            />
          ))}
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Close feedback"
          onClick={onClose}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {phase.kind === 'thanks' ? (
        <p
          id="deskzen-feedback-title"
          className="pb-1 text-base font-semibold"
          role="status"
        >
          {THANKS}
        </p>
      ) : (
        <FeedbackStep
          key={step}
          question={question}
          pending={pending}
          note={note}
          onNote={setNote}
          onChoose={choose}
          onSkip={skip}
          onSend={sendNote}
        />
      )}
    </section>
  );
}
