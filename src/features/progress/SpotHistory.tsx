import { summaryLine, dailySummary, type SpotRecord } from '../../lib/spotcheck/history';

export function SpotHistory({ records, now }: { records: SpotRecord[]; now: number }) {
  const summary = dailySummary(records, now);
  const recent = [...records].reverse().slice(0, 12);
  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">Spot check history</h2>
      <p className="mt-1 text-sm text-ink-muted">{records.length === 0 ? 'No checks yet today.' : summaryLine(summary)}</p>
      {recent.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm">
          {recent.map((record) => (
            <li key={record.at} className="flex items-baseline justify-between gap-3 rounded-xl bg-surface px-3 py-2">
              <span className="text-ink">
                {new Date(record.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {record.posture === 'standing' ? 'Standing' : 'Sitting'}
              </span>
              <span className="font-semibold text-ink">{record.outcome === 'away' ? 'Away' : record.score === null ? '—' : Math.round(record.score)}{record.issue ? ` · ${issueLabel(record.issue)}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function issueLabel(issue: NonNullable<SpotRecord['issue']>): string {
  if (issue === 'lean') return 'leaning in';
  if (issue === 'headDrop') return 'head drop';
  if (issue === 'shoulders') return 'shoulders';
  if (issue === 'distance') return 'too close';
  return 'hip lean';
}
