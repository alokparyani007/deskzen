export function CompareChart({
  points,
  currentName,
  previousName,
}: {
  points: { key: string; label: string; current: number | null; previous: number | null }[];
  currentName: string;
  previousName: string;
}) {
  const width = 640;
  const height = 220;
  const line = (key: 'current' | 'previous') => points.map((point, index) => {
    const value = point[key];
    if (value === null) return null;
    const x = 40 + (index / Math.max(1, points.length - 1)) * (width - 70);
    const y = height - 30 - (Math.max(0, Math.min(100, value)) / 100) * (height - 50);
    return { x, y, value, label: point.label };
  }).filter((point): point is { x: number; y: number; value: number; label: string } => point !== null);
  const current = line('current');
  const previous = line('previous');
  const path = (dots: { x: number; y: number }[]) => dots.map((dot, index) => `${index === 0 ? 'M' : 'L'} ${dot.x} ${dot.y}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 w-full" role="img" aria-label={`${currentName} compared with ${previousName}`}>
      <path d={path(current)} fill="none" stroke="var(--color-print)" strokeWidth="3" />
      <path d={path(previous)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 6" />
      {current.map((dot) => <text key={dot.label} x={dot.x} y={dot.y - 8} textAnchor="middle" fontSize="12" fill="var(--color-print)">{dot.value}</text>)}
      {points.map((point, index) => <text key={point.key} x={40 + (index / Math.max(1, points.length - 1)) * (width - 70)} y={height - 8} textAnchor="middle" fontSize="12" fill="#475569">{point.label}</text>)}
      <g fontSize="12">
        <text x="40" y="16" fill="var(--color-print)">{currentName}</text>
        <text x="160" y="16" fill="#64748b">{previousName}</text>
      </g>
    </svg>
  );
}
