import { Check, Heart, Sparkles, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bodyCheck, highlightedRow, type CoachDrift } from './coach';

export function LiveSidePanel({
  ready,
  estimated,
  hasPrint,
  drift,
  bounces,
  pose,
  waiting,
}: {
  ready: boolean;
  estimated?: boolean;
  hasPrint: boolean;
  drift: CoachDrift | null;
  bounces: number;
  pose: 'sit' | 'stand';
  waiting: string | null;
}) {
  const rows = bodyCheck(drift, ready, estimated, hasPrint ? waiting : null);
  const active = ready && !waiting ? highlightedRow(drift) : null;
  const times = bounces === 1 ? 'time' : 'times';
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
        <h2 className="flex items-center justify-between text-sm font-semibold text-ink">
          Body check
          <Heart className="size-4 text-print" aria-hidden="true" />
        </h2>
        <ul className="mt-2 space-y-1">
          {rows.map((row) => (
            <li key={row.id} className={`flex items-center gap-2 rounded-xl px-1 py-1.5 ${active === row.id ? 'bg-brand-tint' : ''}`}>
              {row.state === 'ok' ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-print text-white" aria-label="OK">
                  <Check className="size-3" aria-hidden="true" />
                </span>
              ) : row.state === 'fix' ? (
                <span className="size-2.5 rounded-full bg-glow" aria-label="Needs a nudge" />
              ) : (
                <span className="text-ink-muted" aria-hidden="true">—</span>
              )}
              <span className={row.state === 'wait' ? 'text-ink-muted' : 'text-ink'}>{row.label}</span>
              {row.estimated ? <span className="sr-only">estimated</span> : null}
            </li>
          ))}
        </ul>
        {!hasPrint ? <p className="mt-2 text-sm text-ink-muted">Set your Zen to start</p> : null}
      </section>
      <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
        <p className="flex items-start justify-between gap-3 text-sm font-semibold text-ink">
          <span>You bounced back {bounces} {times} today</span>
          <Sparkles className="mt-0.5 size-4 shrink-0 text-glow" aria-hidden="true" />
        </p>
        <Link
          to={`/set-my-zen?pose=${pose}&from=live`}
          className="mt-3 flex h-11 items-center justify-center gap-2 rounded-full border border-print text-sm font-semibold text-print"
        >
          <UserRound className="size-4" aria-hidden="true" />
          Set my Zen
        </Link>
      </section>
      <p className="px-1 text-xs text-ink-muted">DeskZen is a wellness tool, not a medical device.</p>
    </div>
  );
}
