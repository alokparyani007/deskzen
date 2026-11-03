import { Minus, X } from 'lucide-react';
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
  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-stage text-white">
      <header className="flex h-16 shrink-0 items-center gap-3 px-4">
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
      {children}
      {debug ? <p className="shrink-0 truncate px-3 pt-1 font-mono text-[11px] text-white/70">{debug}</p> : null}
      <p className="shrink-0 pb-2 text-center text-xs text-white/55">DeskZen is a wellness tool, not a medical device.</p>
    </div>
  );
}

export function StepPill({ label }: { label: string }) {
  return <p className="rounded-full border border-white/15 bg-slate-900/70 px-4 py-2 text-sm font-medium backdrop-blur-md">{label}</p>;
}
