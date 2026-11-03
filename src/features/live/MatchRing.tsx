export function MatchPill({ percent, floating = true }: { percent: number; floating?: boolean }) {
  const dot = percent >= 80 ? 'bg-outline' : percent >= 60 ? 'bg-glow' : 'bg-alert';
  const place = floating ? 'absolute left-1/2 top-3 z-20 -translate-x-1/2' : '';
  return (
    <p className={`${place} inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md`} aria-live="polite">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {percent}% match
    </p>
  );
}
