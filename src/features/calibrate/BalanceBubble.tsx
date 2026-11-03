import type { OrbPoint } from '../../lib/posture/bubble';

export function BalanceBubble({
  orb,
  progress,
  paused,
  shouldersOk,
}: {
  orb: OrbPoint;
  progress: number;
  paused: boolean;
  shouldersOk: boolean;
}) {
  const radius = 28;
  const length = 2 * Math.PI * radius;
  const x = 50 + Math.max(-36, Math.min(36, (orb.x / 0.12) * radius));
  const y = 50 + Math.max(-36, Math.min(36, (orb.y / 0.12) * radius));
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 100 100" className="h-48 w-48 max-h-[46%] max-w-[70%]">
        <circle cx="50" cy="50" r={radius} fill="none" className="stroke-brand/30" strokeWidth="2" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className="stroke-glow"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(0, Math.min(1, progress)) * length} ${length}`}
          transform="rotate(-90 50 50)"
        />
        <circle cx={x} cy={y} r="6" className="fill-brand-light" />
      </svg>
      <p className="absolute bottom-16 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-ink shadow-sm">
        {shouldersOk ? (paused ? 'Paused. Come back to the ring.' : 'Balance the bubble') : 'Level your shoulders'}
      </p>
    </div>
  );
}
