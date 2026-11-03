import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Minus, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CoachChip, CoachDrift } from './coach';

const ICONS: Record<CoachDrift, typeof ArrowUp> = {
  'head-forward': ArrowUp,
  'head-down': ArrowUp,
  slouch: ArrowUp,
  'lean-left': ArrowLeft,
  'lean-right': ArrowRight,
  'shoulders-tilt': Minus,
  'shoulders-up': ArrowDown,
  'too-close': ArrowDown,
  'too-far': ArrowUp,
  'out-of-frame': ScanLine,
  'chin-slouch': ArrowUp,
};

export function InstructionCard({ chip }: { chip: CoachChip }) {
  const Icon = chip.drift ? ICONS[chip.drift] : Check;
  const zen = chip.tone === 'zen';
  return (
    <div className="pointer-events-none absolute bottom-14 left-1/2 z-10 w-[min(420px,calc(100%-1.5rem))] -translate-x-1/2">
      <div
        className={`flex items-center gap-3 rounded-2xl p-3 shadow-lg backdrop-blur transition-colors duration-300 ${zen ? 'coach-pop bg-print text-white' : 'bg-white/85 text-ink'}`}
        aria-live="polite"
      >
        <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${zen ? 'bg-white/20 text-white' : 'bg-glow-tint text-glow'}`} aria-hidden="true">
          <Icon className="size-7" />
        </span>
        <span>
          <span className="block text-[22px] font-bold leading-tight">{chip.title}</span>
          <span className={`mt-0.5 block text-sm ${zen ? 'text-white/90' : 'text-ink-muted'}`}>{chip.helper}</span>
        </span>
      </div>
    </div>
  );
}

export function SetZenCard({ pose, floating = false }: { pose: 'sit' | 'stand'; floating?: boolean }) {
  const card = (
    <div className="w-full max-w-md rounded-3xl border border-white/12 bg-slate-900/72 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <p className="flex items-center gap-2 text-lg font-semibold">
        <span className="flex size-8 items-center justify-center rounded-lg bg-print text-sm font-bold" aria-hidden="true">Z</span>
        Set your Zen first
      </p>
      <p className="mt-1 text-base text-white/80">It takes 15 seconds so I know your best posture.</p>
      <Link to={`/set-my-zen?pose=${pose}&from=live`} className="mt-4 flex h-11 items-center justify-center rounded-xl bg-print text-base font-semibold text-white">
        Set my Zen
      </Link>
    </div>
  );
  if (!floating) return card;
  return <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center px-6">{card}</div>;
}
