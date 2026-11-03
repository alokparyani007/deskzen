import type { ReactNode } from 'react';
import { Camera, Check, LoaderCircle, UserRound } from 'lucide-react';

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
    <div className="mx-[2%] mb-3 flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-dock px-4 py-3 text-white backdrop-blur-md">
      <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-full ${badge}`} aria-hidden="true">
        <Icon className={`size-6 ${tone === 'wait' ? 'animate-spin' : ''} ${tone === 'coach' ? 'text-ink' : 'text-white'}`} />
        {typeof hold === 'number' ? <HoldRing fraction={hold} /> : null}
      </span>
      <div className={`min-w-0 ${aside ? '' : 'flex-1'}`} aria-live="polite">
        <p className="text-2xl font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-base text-white/80">{helper}</p>
        {note ? <p className="mt-1 text-sm text-white/70">{note}</p> : null}
      </div>
      {aside ? <div className="flex min-w-0 flex-1 items-center justify-center px-3">{aside}</div> : null}
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

function HoldRing({ fraction }: { fraction: number }) {
  const radius = 22;
  const length = 2 * Math.PI * radius;
  return (
    <svg className="absolute inset-0 size-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
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
