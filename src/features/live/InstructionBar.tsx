import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ScanLine } from 'lucide-react';
import type { CoachChip } from './coach';
import { guideMarks, guideProgress, type GuideMemory, type MoveCue } from './guide';

const CUE_ICON = {
  up: ArrowUp,
  back: ArrowUp,
  left: ArrowLeft,
  right: ArrowRight,
  down: ArrowDown,
} as const;

export function InstructionBar({
  chip,
  cue,
  memory,
  hold,
  showSteps,
  bare = false,
}: {
  chip: CoachChip;
  cue: MoveCue | null;
  memory: GuideMemory;
  hold: number;
  showSteps: boolean;
  bare?: boolean;
}) {
  const zen = chip.tone === 'zen';
  const Icon = zen ? Check : cue ? CUE_ICON[cue] : ScanLine;
  const marks = guideMarks(memory);
  const progress = guideProgress(memory);
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const guiding = memory.phase === 'step';
  const shell = bare ? 'text-white' : `rounded-2xl border border-white/15 p-3 backdrop-blur-md ${zen ? 'bg-print text-white' : 'bg-slate-900/72 text-white'}`;
  return (
    <div className={shell} aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex size-12 shrink-0 items-center justify-center">
          {guiding && hold > 0 ? (
            <svg viewBox="0 0 56 56" className="absolute inset-0 size-12 -rotate-90" aria-hidden="true">
              <circle cx="28" cy="28" r={radius} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
              <circle
                cx="28"
                cy="28"
                r={radius}
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, hold)))}
              />
            </svg>
          ) : null}
          <span className={`flex size-10 items-center justify-center rounded-full ${zen ? 'bg-white/20 text-white' : 'bg-white/10 text-white'}`} aria-hidden="true">
            <Icon className="size-5" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          {progress ? <span className="block text-sm font-medium text-white/80">Step {progress.step} of {progress.total}</span> : null}
          <span className="block text-[22px] font-semibold leading-tight text-white">{chip.title}</span>
          <span className="mt-0.5 block text-[15px] text-white/80">{chip.helper}</span>
        </span>
      </div>
      {showSteps ? (
        <div className="mt-3 flex items-center gap-1.5" aria-label="Guide steps">
          <StepDot mark={marks.chin} label="1" />
          <StepDot mark={marks.shoulders} label="2" />
          <StepDot mark={marks.sit} label="3" />
        </div>
      ) : null}
    </div>
  );
}

function StepDot({ mark, label }: { mark: 'wait' | 'current' | 'done' | 'skip'; label: string }) {
  if (mark === 'done' || mark === 'skip') {
    return (
      <span className="flex size-4 items-center justify-center rounded-full bg-print text-white">
        <Check className="size-2.5" aria-hidden="true" />
        <span className="sr-only">Step {label} done</span>
      </span>
    );
  }
  return <span className={`size-2.5 rounded-full ${mark === 'current' ? 'bg-glow' : 'bg-white/30'}`} aria-hidden="true" />;
}
