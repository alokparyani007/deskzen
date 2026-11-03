import { PRINT_FLOW, printStepLabel, type PrintStepName } from './printSteps';
import { printButton, printOutlineButton } from './printButton';

export function PrintFooter({
  step,
  onBack,
  onNext,
  nextLabel,
}: {
  step: PrintStepName;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  const current = PRINT_FLOW.indexOf(step);
  return (
    <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-6">
      <button type="button" className={`min-h-11 ${printOutlineButton}`} onClick={onBack}>
        Back
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold text-ink">{printStepLabel(step)}</p>
        <ol className="mt-1 flex items-center justify-center gap-1.5" aria-hidden="true">
          {PRINT_FLOW.map((name, index) => (
            <li key={name} className={`size-2 rounded-full ${index === current ? 'bg-print' : index < current ? 'bg-print/50' : 'bg-ink/15'}`} />
          ))}
        </ol>
      </div>
      <button type="button" className={`min-h-11 ${printButton}`} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}
