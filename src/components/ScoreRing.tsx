import { formatScore } from '../lib/home';

type ScoreRingProps = {
  score: number;
  label?: string;
  caption?: string;
  size?: 'md' | 'lg';
  tone?: 'good' | 'okay' | 'low';
};

export function ScoreRing({ score, label, caption, size = 'lg', tone = 'good' }: ScoreRingProps) {
  const text = formatScore(score);
  const numeric = Number(text);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (numeric / 100) * circumference;
  const box = size === 'lg' ? 'size-44' : 'size-36';

  return (
    <div className={`relative ${box}`} aria-live="polite">
      <svg
        viewBox="0 0 120 120"
        className="h-full w-full -rotate-90 drop-shadow-[0_0_18px_var(--color-glow)]"
        role="img"
        aria-label={`Posture score ${text} out of 100${label ? `, ${label}` : ''}`}
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          className="stroke-brand-tint"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          className={tone === 'okay' ? 'stroke-glow' : tone === 'low' ? 'stroke-alert' : 'stroke-brand'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-bold tabular-nums tracking-tight ${tone === 'good' ? 'text-brand' : 'text-ink'}`}>{text}</span>
        {label ? <span className="text-sm font-semibold text-ink">{label}</span> : null}
        {caption ? <span className="text-xs text-ink-muted">{caption}</span> : null}
      </div>
    </div>
  );
}
