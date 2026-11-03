import { Volume2 } from 'lucide-react';

/** Small match ring in the camera's top-left. Emerald on track, amber while drifting. */
export function CornerMatchRing({ percent, drifting }: { percent: number | null; drifting: boolean }) {
  const value = percent === null ? 0 : Math.max(0, Math.min(100, Math.round(percent)));
  const radius = 22;
  const length = 2 * Math.PI * radius;
  const color = drifting ? 'var(--color-glow)' : 'var(--color-outline)';
  return (
    <div
      className="absolute left-3 top-3 z-10 flex size-16 items-center justify-center rounded-full bg-slate-950/50 text-white backdrop-blur-sm"
      aria-live="polite"
      aria-label={percent === null ? 'Fit unavailable' : `${value} percent fit, ${drifting ? 'drifting' : 'on track'}`}
    >
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="3.5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(length * value) / 100} ${length}`}
        />
      </svg>
      <span className="text-sm font-semibold">{percent === null ? '—' : `${value}%`}</span>
    </div>
  );
}

export function TrackStatusPill({ label, drifting }: { label: string; drifting: boolean }) {
  return (
    <p
      className={`absolute right-3 top-3 z-10 rounded-full px-3 py-1.5 text-sm font-medium backdrop-blur-md ${drifting ? 'bg-glow text-ink' : 'bg-slate-900/70 text-white/90'}`}
      aria-live="polite"
    >
      {label}
    </p>
  );
}

/** Coaching line under the shoulders. On track is quiet text. A drift tip sits in a pill. */
export function CoachLine({ text, loud }: { text: string; loud: boolean }) {
  if (!loud) {
    return (
      <p className="pointer-events-none absolute inset-x-6 bottom-4 z-10 text-center text-base font-medium text-white" style={{ textShadow: '0 1px 6px rgb(0 0 0 / 0.8)' }} aria-live="polite">
        {text}
      </p>
    );
  }
  return (
    <p className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center" aria-live="polite">
      <span className="inline-flex max-w-[min(36rem,calc(100%-2rem))] items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
        <Volume2 className="size-4 shrink-0" aria-hidden="true" />
        {text}
      </span>
    </p>
  );
}
