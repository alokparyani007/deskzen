import { SLOUCH_COPY } from '../../calibration/catchMeter';
import { printButton } from './printButton';

export function SlouchMeter({
  value,
  pulsing,
  line,
  countdown,
  holdFraction,
  showFallback,
  hideStatus = false,
  onAccept,
}: {
  value: number;
  pulsing: boolean;
  line: string;
  countdown: number | null;
  holdFraction: number;
  showFallback: boolean;
  hideStatus?: boolean;
  onAccept: () => void;
}) {
  const shown = Math.min(1, Math.max(0, value));
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-[20px] border border-white/12 bg-slate-900/70 p-3 text-white backdrop-blur-md">
      <p className="text-sm font-semibold">
        Slouch meter
        <span className="ml-1 text-white/60" title="How far this pose is from your Zen">ⓘ</span>
      </p>
      <Track value={shown} pulsing={pulsing} />
      <span className="text-xs font-semibold text-outline">Your best</span>
      <span className="-mt-1 text-xs font-semibold text-glow">Slouch</span>
      {hideStatus || !line ? null : (
        <div className="flex items-center gap-2">
          <p className="text-center text-xs font-semibold" aria-live="polite">{line}</p>
          {countdown !== null ? <HoldClock seconds={countdown} fraction={holdFraction} /> : null}
        </div>
      )}
      {showFallback ? (
        <button type="button" className={`min-h-11 ${printButton}`} onClick={onAccept}>
          {SLOUCH_COPY.fallback}
        </button>
      ) : null}
    </div>
  );
}

function Track({ value, pulsing }: { value: number; pulsing: boolean }) {
  const at = `${value * 100}%`;
  return (
    <div
      role="meter"
      aria-label="Slouch meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="relative h-40 w-8 overflow-hidden rounded-full"
      style={{ background: 'linear-gradient(to bottom, var(--color-outline), var(--color-glow))' }}
    >
      <span className="absolute z-10 size-4 transition-[top] duration-150 motion-reduce:transition-none" style={{ top: at, left: '50%', transform: 'translate(-50%, -50%)' }}>
        <span className={`block size-full rounded-full border-2 border-white bg-white shadow-md ${pulsing ? 'meter-pulse' : ''}`} />
      </span>
    </div>
  );
}

function HoldClock({ seconds, fraction }: { seconds: number; fraction: number }) {
  const radius = 28;
  const lap = 2 * Math.PI * radius;
  const shown = Math.min(1, Math.max(0, fraction));
  return (
    <svg viewBox="0 0 72 72" className="size-9 shrink-0" role="img" aria-label={`${seconds} seconds`}>
      <circle cx="36" cy="36" r={radius} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="4" />
      <circle
        cx="36"
        cy="36"
        r={radius}
        fill="none"
        stroke="var(--color-print)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={lap}
        strokeDashoffset={lap * (1 - shown)}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="42" textAnchor="middle" fill="white" fontSize="22" fontWeight="700">
        {seconds}
      </text>
    </svg>
  );
}
