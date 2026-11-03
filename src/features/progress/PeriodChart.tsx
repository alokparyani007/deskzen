import type { RangePoint } from '../../lib/progress/dashboard';

/** This period (solid emerald) vs the last one (dashed, muted). Dark theme, plain SVG, no chart library. */
export function PeriodChart({ points, currentName, previousName }: { points: readonly RangePoint[]; currentName: string; previousName: string }) {
  const values = points.flatMap((point) => [point.current, point.previous]).filter((value): value is number => value !== null);
  if (values.length === 0) return <p className="py-6 text-sm text-white/60">The chart fills in as you track.</p>;
  let low = Math.max(0, Math.floor((Math.min(...values) - 5) / 10) * 10);
  let high = Math.min(100, Math.ceil((Math.max(...values) + 5) / 10) * 10);
  if (high - low < 20) {
    high = Math.min(100, low + 20);
    low = high - 20;
  }
  const ticks: number[] = [];
  for (let tick = low; tick <= high; tick += 10) ticks.push(tick);
  const label = `Posture score, ${currentName} compared with ${previousName}`;

  return (
    <figure className="mt-3">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-4 text-xs text-white/70" aria-hidden="true">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-brand-light" />
          {currentName}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-5 border-t-2 border-dashed border-white/40" />
          {previousName}
        </span>
      </div>
      <Plot points={points} ticks={ticks} low={low} high={high} width={900} height={230} labels={8} label={label} className="hidden w-full sm:block" />
      <Plot points={points} ticks={ticks} low={low} high={high} width={420} height={260} labels={4} label={label} className="w-full sm:hidden" />
      <table className="sr-only">
        <caption>Posture score</caption>
        <thead>
          <tr>
            <th scope="col">When</th>
            <th scope="col">{currentName}</th>
            <th scope="col">{previousName}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{point.current ?? 'No data'}</td>
              <td>{point.previous ?? 'No data'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Plot({
  points,
  ticks,
  low,
  high,
  width,
  height,
  labels,
  label,
  className,
}: {
  points: readonly RangePoint[];
  ticks: number[];
  low: number;
  high: number;
  width: number;
  height: number;
  labels: number;
  label: string;
  className: string;
}) {
  const left = 34;
  const right = 14;
  const top = 12;
  const bottom = 28;
  const x = (index: number) => left + (points.length <= 1 ? (width - left - right) / 2 : (index / (points.length - 1)) * (width - left - right));
  const y = (value: number) => top + (1 - (value - low) / (high - low)) * (height - top - bottom);
  const segments = (key: 'current' | 'previous') => {
    const out: string[] = [];
    let path = '';
    points.forEach((point, index) => {
      const value = point[key];
      if (value === null) {
        if (path) out.push(path);
        path = '';
        return;
      }
      path += `${path ? 'L' : 'M'}${x(index).toFixed(1)} ${y(value).toFixed(1)} `;
    });
    if (path) out.push(path);
    return out;
  };
  const every = Math.max(1, Math.ceil(points.length / labels));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label={label}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="rgb(255 255 255 / 0.08)" />
          <text x={left - 8} y={y(tick) + 4} textAnchor="end" fontSize="12" fill="rgb(255 255 255 / 0.5)">
            {tick}
          </text>
        </g>
      ))}
      {segments('previous').map((d) => (
        <path key={`p${d}`} d={d} fill="none" stroke="rgb(255 255 255 / 0.4)" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
      ))}
      {segments('current').map((d) => (
        <path key={`c${d}`} d={d} fill="none" stroke="var(--color-brand-light)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {points.map((point, index) => (
        <g key={point.key}>
          {point.previous === null ? null : <circle cx={x(index)} cy={y(point.previous)} r="2.5" fill="rgb(255 255 255 / 0.45)" />}
          {point.current === null ? null : <circle cx={x(index)} cy={y(point.current)} r="4" fill="var(--color-brand-light)" stroke="var(--color-stage)" strokeWidth="2" />}
          {index % every === 0 ? (
            <text x={x(index)} y={height - 8} textAnchor="middle" fontSize="12" fill="rgb(255 255 255 / 0.55)">
              {point.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
