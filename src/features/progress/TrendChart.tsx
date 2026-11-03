type TrendChartProps = {
  days: readonly { date: string; score: number | null }[];
};

export function TrendChart({ days }: TrendChartProps) {
  const width = 320;
  const height = 120;
  const points = days.map((day, index) => {
    const x = days.length <= 1 ? width / 2 : (index / (days.length - 1)) * width;
    const y = height - ((day.score ?? 0) / 100) * height;
    return { ...day, x, y };
  });
  const line = points
    .filter((point) => point.score !== null)
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-ink">30-day trend</h2>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-32 w-full" role="img" aria-label="30 day posture trend">
        <path d={line} fill="none" className="stroke-brand" strokeWidth="3" />
      </svg>
      <table className="sr-only">
        <caption>Daily average scores</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => (
            <tr key={day.date}>
              <td>{day.date}</td>
              <td>{day.score === null ? 'No data' : Math.round(day.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
