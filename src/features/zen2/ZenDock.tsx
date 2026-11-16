import type { ReactNode } from 'react';
import { Camera, Check, LoaderCircle, UserRound } from 'lucide-react';
import { zenDockActionsClass, zenDockClass } from './stageLayout';

export function ZenDock({
  tone,
  title,
  helper,
  note,
  hold,
  aside,
  children,
}: {
  tone: 'coach' | 'ready' | 'good' | 'wait';
  title: string;
  helper: string;
  note?: string | null;
  hold?: number | null;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  const Icon = tone === 'good' ? Check : tone === 'ready' ? Camera : tone === 'wait' ? LoaderCircle : UserRound;
  const badge = tone === 'good' || tone === 'ready' ? 'bg-print' : 'bg-glow text-ink';
  return (
    <div className={zenDockClass}>
      <div className="flex min-w-0 items-start gap-3 md:flex-1 md:items-center">
        <span className={`relative flex size-11 shrink-0 items-center justify-center rounded-full md:size-12 ${badge}`} aria-hidden="true">
          <Icon className={`size-6 ${tone === 'wait' ? 'animate-spin' : ''} ${tone === 'coach' ? 'text-ink' : 'text-white'}`} />
          {typeof hold === 'number' ? <HoldRing fraction={hold} /> : null}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <p className="text-lg font-semibold leading-tight md:text-2xl">{title}</p>
          <p className="mt-0.5 text-sm text-white/80 md:text-base">{helper}</p>
          {note ? <p className="mt-1 text-sm text-white/70">{note}</p> : null}
        </div>
      </div>
      {aside ? <div className="flex min-w-0 items-center md:flex-1 md:justify-center md:px-3">{aside}</div> : null}
      <div className={zenDockActionsClass}>{children}</div>
    </div>
  );
}

function HoldRing({ fraction }: { fraction: number }) {
  const radius = 22;
  const length = 2 * Math.PI * radius;
  return (
    <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r={radius} fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="3" />
      <circle cx="24" cy="24" r={radius} fill="none" stroke="white" strokeWidth="3" strokeDasharray={`${length * fraction} ${length}`} />
    </svg>
  );
}

export function DockButton({
  children,
  onClick,
  primary,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex h-12 items-center justify-center rounded-full px-5 text-lg font-semibold ${primary ? 'bg-print text-white disabled:opacity-40' : 'border border-white/40 text-white'}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
