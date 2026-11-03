import type { HomeSnapshot } from '../../lib/home';

type WeeklyChartProps = {
  days: HomeSnapshot['weekly'];
};

export function WeeklyChart({ days }: WeeklyChartProps) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">This week</h2>
        <span className="inline-flex items-center gap-2 text-xs text-ink-muted">
          <span className="size-2 rounded-full bg-brand" aria-hidden="true" />
          Daily average
        </span>
      </header>
      <div className="mt-4 flex gap-3">
        <div className="flex h-32 flex-col justify-between text-[11px] tabular-nums text-ink-muted">
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
        <ul className="flex h-32 flex-1 items-end gap-2" aria-label="Daily average scores this week">
          {days.map((day) => (
            <li key={day.day} className="flex h-full flex-1 flex-col justify-end">
              <div className="flex h-full items-end">
                <div
                  className="w-full rounded-t-md bg-brand"
                  style={{ height: `${day.score}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ul className="mt-2 flex gap-2 pl-8" aria-hidden="true">
        {days.map((day) => (
          <li key={day.day} className="flex-1 text-center text-[11px] text-ink-muted">
            {day.day}
          </li>
        ))}
      </ul>
      <table className="sr-only">
        <caption>Daily average posture scores</caption>
        <thead>
          <tr>
            <th>Day</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.day}>
              <td>{day.day}</td>
              <td>{day.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
