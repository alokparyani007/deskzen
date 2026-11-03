/** Step 3 chrome: hold ring top-left, live fit pill top-right, caption under the shoulders. */
export function FitStep({ fraction, fit }: { fraction: number; fit: number | null }) {
  const radius = 30;
  const length = 2 * Math.PI * radius;
  const shown = fit === null ? null : Math.round(fit);
  return (
    <>
      <div
        className="pointer-events-none absolute left-3 top-3 z-10 flex size-[4.75rem] items-center justify-center rounded-full bg-slate-950/45 text-white backdrop-blur-sm"
        role="img"
        aria-label="Hold 3 seconds"
      >
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 76 76" aria-hidden="true">
          <circle cx="38" cy="38" r={radius} fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="3" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke="var(--color-outline)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${length * fraction} ${length}`}
          />
        </svg>
        <span className="text-center text-xs font-semibold leading-tight">Hold 3 s</span>
      </div>
      <p className="absolute right-3 top-3 z-10 rounded-full bg-print px-3 py-1.5 text-sm font-semibold text-white" aria-live="polite">
        {shown === null ? 'Fit —' : `Fit ${shown}%`}
      </p>
      <p className="pointer-events-none absolute inset-x-4 bottom-4 z-10 text-center text-base font-medium text-white" style={{ textShadow: '0 1px 6px rgb(0 0 0 / 0.75)' }}>
        Great, hold right there
      </p>
    </>
  );
}
