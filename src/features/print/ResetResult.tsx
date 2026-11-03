import { baselineScore, shoulderDropInches, type Looseness, type RestSnapshot } from '../../calibration/bodyReset';
import { CheckIcon } from './CheckIcon';
import { printButton } from './printButton';

export function ResetResult({
  before,
  after,
  looseness,
  retried,
  showActions = true,
  onRetry,
  onContinue,
  onBack,
}: {
  before: RestSnapshot | null;
  after: RestSnapshot | null;
  looseness: Looseness | null;
  retried: boolean;
  showActions?: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const loose = looseness !== null && looseness.score >= 80;
  const inches = before && after ? shoulderDropInches(before, after) : null;
  const showRetry = looseness !== null && !loose && !retried && looseness.retry !== null;
  return (
    <div className="rounded-3xl bg-white px-6 py-6 shadow-sm ring-1 ring-surface">
      <h2 className="text-2xl font-semibold text-ink" aria-live="polite">
        {loose ? "You're loose and ready! ✨" : looseness?.message ?? 'Sit normally for a moment.'}
      </h2>
      {looseness && before ? (
        <Meter before={baselineScore(before)} after={looseness.score} />
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Keep sitting as you are. This only takes a moment.</p>
      )}
      <ul className="mt-4 space-y-2">
        {inches !== null ? <Row pass label={`Shoulders dropped about ${inches.toFixed(1)} in`} /> : null}
        <Row pass={looseness?.level ?? false} label="Shoulders level" />
        <Row pass={looseness?.stacked ?? false} label="Head stacked over shoulders" />
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Measured on this device. No video saved.</p>
      {showActions ? (
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-ink" onClick={onBack}>
          Back
        </button>
        {showRetry ? (
          <button type="button" className={`min-h-11 ${printButton}`} onClick={onRetry}>
            {looseness.retry === 'chin' ? 'One more chin glide' : looseness.retry === 'breath' ? 'One more breath' : 'One more roll'}
          </button>
        ) : (
          <button type="button" className={`min-h-11 ${printButton}`} onClick={onContinue}>
            Continue to Lock
          </button>
        )}
      </div>
      ) : null}
    </div>
  );
}

function Meter({ before, after }: { before: number; after: number }) {
  return (
    <div className="mt-4">
      <p className="text-sm text-ink-muted">Looseness meter</p>
      <div className="relative mt-3 h-3 rounded-full bg-surface">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, var(--color-glow), var(--color-print))' }} />
        <Mark at={before} />
        <Mark at={after} />
      </div>
      <div className="relative mt-2 h-10 text-center text-xs text-ink-muted">
        <span className="absolute -translate-x-1/2" style={{ left: `${clamp(before)}%` }}>
          Before
          <br />
          <span className="text-sm font-semibold text-ink">{before}</span>
        </span>
        <span className="absolute -translate-x-1/2" style={{ left: `${clamp(after)}%` }}>
          After
          <br />
          <span className="text-sm font-semibold text-ink">{after}</span>
        </span>
      </div>
    </div>
  );
}

function Mark({ at }: { at: number }) {
  return <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white shadow ring-2 ring-glow" style={{ left: `${clamp(at)}%` }} />;
}

function Row({ pass, label }: { pass: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm font-semibold text-ink">
      {pass ? (
        <span className="flex size-6 items-center justify-center rounded-full bg-print text-white">
          <CheckIcon className="size-3.5" />
        </span>
      ) : (
        <span className="size-3 rounded-full bg-glow" aria-hidden="true" />
      )}
      {label}
    </li>
  );
}

function clamp(value: number): number {
  return Math.max(4, Math.min(96, value));
}
