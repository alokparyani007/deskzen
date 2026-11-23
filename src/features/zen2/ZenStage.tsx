import { Minus, Pause, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '../../components/Logo';
import { HdCameraPill } from '../print/HdCameraPill';
import { useCamera } from '../camera/camera-context';

export function ZenStage({
  center,
  onClose,
  onMinimize,
  voice,
  onVoice,
  showVoice,
  debug,
  children,
}: {
  center: ReactNode;
  onClose: () => void;
  onMinimize?: () => void;
  voice?: boolean;
  onVoice?: (value: boolean) => void;
  showVoice?: boolean;
  debug?: string | null;
  children: ReactNode;
}) {
  const camera = useCamera();
  const control =
    'inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-2 text-xs font-semibold text-white backdrop-blur-md';
  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-stage text-white max-[599px]:overflow-y-auto">
      <header className="flex h-16 shrink-0 items-center gap-3 px-4 max-[599px]:hidden">
        <Logo tone="onBrand" />
        <div className="flex min-w-0 flex-1 items-center justify-center">{center}</div>
        <div className="flex shrink-0 items-center gap-2">
          {showVoice && onVoice ? (
            <button
              type="button"
              role="switch"
              aria-checked={voice}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-medium backdrop-blur-md"
              onClick={() => onVoice(!voice)}
            >
              <span className={`size-2 rounded-full ${voice ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
              Voice {voice ? 'on' : 'off'}
            </button>
          ) : null}
          <HdCameraPill />
          {camera.status === 'live' ? (
            <button type="button" className="h-10 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-semibold backdrop-blur-md" onClick={camera.pause}>
              Pause
            </button>
          ) : null}
          {onMinimize ? (
            <button type="button" className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/70 backdrop-blur-md" aria-label="Minimize" onClick={onMinimize}>
              <Minus className="size-5" aria-hidden="true" />
            </button>
          ) : null}
          <button type="button" className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/70 backdrop-blur-md" aria-label="Close" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>
      <header className="sticky top-0 z-20 hidden shrink-0 flex-col gap-2 border-b border-white/10 bg-stage px-3 py-2 max-[599px]:flex">
        <div className="flex items-center gap-2">
          <Logo tone="onBrand" className="shrink-0" />
          <div className="flex min-w-0 flex-1 items-center justify-end">{center}</div>
        </div>
        <div className="flex gap-2">
          {showVoice && onVoice ? (
            <button type="button" role="switch" aria-checked={voice} aria-label={voice ? 'Voice on' : 'Voice off'} className={control} onClick={() => onVoice(!voice)}>
              <span className={`size-2 shrink-0 rounded-full ${voice ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
              Voice
            </button>
          ) : null}
          <HdCameraPill compact />
          {camera.status === 'live' ? (
            <button type="button" className={control} onClick={camera.pause}>
              <Pause className="size-4 shrink-0" aria-hidden="true" />
              Pause
            </button>
          ) : null}
          <button type="button" className={control} aria-label="Close" onClick={onClose}>
            <X className="size-4 shrink-0" aria-hidden="true" />
            Close
          </button>
        </div>
      </header>
      {children}
      {debug ? <p className="shrink-0 truncate px-3 pt-1 font-mono text-[11px] text-white/70">{debug}</p> : null}
      <p className="shrink-0 pb-2 text-center text-xs text-white/55">DeskZen is a wellness tool, not a medical device.</p>
    </div>
  );
}

export function StepPill({ label }: { label: string }) {
  return (
    <p className="rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm font-medium backdrop-blur-md max-[599px]:whitespace-nowrap max-[599px]:px-3 max-[599px]:py-1.5 max-[599px]:text-[13px]">
      {label}
    </p>
  );
}
