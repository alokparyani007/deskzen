import { Check, Lock, PersonStanding, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Logo } from '../../components/Logo';
import { shoulderObjectPosition } from '../../lib/vision/toScreen';
import type { Landmarks } from '../../lib/posture/types';
import { stopSpeech } from '../calibrate/glowVoice';
import { CameraStage } from '../camera/CameraStage';
import { MatchPill } from '../live/MatchRing';
import { HdCameraPill } from './HdCameraPill';
import { LockParticles } from './LockParticles';
import { MoveIcon } from './moveIcons';
import { useZenChromeState, useZenVoice, ZenChromeProvider, ZenVoiceProvider, type ZenChrome, type ZenIcon } from './zenChrome';

const STEPS = [
  { id: 'setup', label: 'Frame check' },
  { id: 'reset', label: 'Loosen up' },
  { id: 'lock', label: 'Find your best' },
  { id: 'catch', label: 'Learn your slouch' },
] as const;

const MUTE_KEY = 'sitglow.glowMuted';

export type ZenStep = (typeof STEPS)[number]['id'] | 'privacy' | 'glow';

export function ImmersiveStage({
  step,
  landmarks,
  reduced,
  onClose,
  children,
}: {
  step: ZenStep;
  landmarks: Landmarks | null;
  lighting: string;
  reduced: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [chrome, setChrome] = useState<ZenChrome>(EMPTY_CHROME);
  const [voice, setVoiceState] = useState(() => window.localStorage.getItem(MUTE_KEY) !== '1');
  const setVoice = (value: boolean) => {
    window.localStorage.setItem(MUTE_KEY, value ? '0' : '1');
    setVoiceState(value);
    if (!value) stopSpeech();
  };
  return (
    <ZenVoiceProvider voice={voice} setVoice={setVoice}>
      <ZenChromeProvider chrome={chrome} setChrome={setChrome}>
        <StageFrame step={step} landmarks={landmarks} reduced={reduced} onClose={onClose}>
          {children}
        </StageFrame>
      </ZenChromeProvider>
    </ZenVoiceProvider>
  );
}

const EMPTY_CHROME: ZenChrome = {
  title: '',
  helper: '',
  countdown: null,
  holdFraction: 0,
  nextLabel: 'Next',
  backLabel: 'Back',
  skipLabel: null,
  showCard: false,
  showNav: false,
  locking: false,
  pulseNext: false,
  match: null,
  kicker: null,
  icon: 'person',
  chips: null,
  nextDisabled: false,
  onBack: () => undefined,
  onNext: () => undefined,
  onSkip: () => undefined,
};

function StageFrame({
  step,
  landmarks,
  reduced,
  onClose,
  children,
}: {
  step: ZenStep;
  landmarks: Landmarks | null;
  reduced: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const chrome = useZenChromeState();
  const { voice, setVoice } = useZenVoice();
  const cameraStep = step === 'setup' || step === 'reset' || step === 'lock' || step === 'catch';
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const chromeRef = useRef(chrome);
  chromeRef.current = chrome;
  const crop = useSmoothedCrop(landmarks);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      const current = chromeRef.current;
      if (!current.showNav) return;
      if (event.key === 'Enter') {
        if (current.nextDisabled) return;
        event.preventDefault();
        current.onNext();
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        current.onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-stage text-white">
      <header className="flex min-h-16 shrink-0 items-center gap-3 px-4 py-2">
        <Logo tone="onBrand" />
        <div className="flex min-w-0 flex-1 items-center justify-center px-2">
          {step === 'catch' || step === 'glow' ? <TrackProgress step={step} /> : cameraStep ? <Progress step={step} celebrated={chrome.icon === 'check'} /> : <span />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {cameraStep ? (
            <button
              type="button"
              role="switch"
              aria-checked={voice}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-medium text-white backdrop-blur-md"
              onClick={() => setVoice(!voice)}
            >
              <span className={`size-2 rounded-full ${voice ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
              Voice {voice ? 'on' : 'off'}
            </button>
          ) : null}
          {cameraStep ? <HdCameraPill /> : null}
          <button type="button" className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/70 backdrop-blur-md" aria-label="Close" onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>
      {cameraStep ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
            {chrome.kicker ? <MoveKicker label={chrome.kicker} /> : null}
            <div className="relative aspect-video w-[min(100%,calc((100dvh-11.5rem)*16/9))] max-w-full overflow-hidden rounded-3xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <CameraStage landmarks={landmarks} alignment={null} showGuides={false} showLandmarks={false} frame="fill" chrome="bare" objectPosition={crop} />
              {chrome.locking && !reduced ? <LockParticles landmarks={landmarks} reduced={reduced} /> : null}
              <div className="pointer-events-none absolute inset-0">{children}</div>
              {typeof chrome.match === 'number' ? <MatchPill percent={chrome.match} /> : null}
            </div>
          </div>
          {chrome.showNav ? <Dock chrome={chrome} reduced={reduced} /> : <div className="h-4 shrink-0" />}
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      )}
    </div>
  );
}

function useSmoothedCrop(frame: Landmarks | null): string {
  const smooth = useRef<number | null>(null);
  const [position, setPosition] = useState('center 42%');
  const raw = shoulderFocus(frame);
  useEffect(() => {
    if (raw === null) return;
    const current = smooth.current;
    const next = current === null ? raw : current + 0.2 * (raw - current);
    smooth.current = next;
    setPosition(`center ${Math.round(next * 100)}%`);
  }, [raw]);
  return position;
}

function shoulderFocus(frame: Landmarks | null): number | null {
  const placed = shoulderObjectPosition(frame);
  const match = placed.match(/(\d+)%/);
  const digits = match?.[1];
  return digits ? Number(digits) / 100 : null;
}

function Progress({ step, celebrated }: { step: ZenStep; celebrated: boolean }) {
  const index = STEPS.findIndex((item) => item.id === step);
  return (
    <ol className="flex items-center gap-1.5" aria-label="Set my Zen progress">
      {STEPS.map((item, itemIndex) => {
        const state = itemIndex < index || (celebrated && itemIndex === index) ? 'done' : itemIndex === index ? 'active' : 'upcoming';
        const pill = state === 'done'
          ? 'bg-print text-white'
          : state === 'active'
            ? 'border border-outline text-white'
            : 'border border-white/15 bg-slate-900/70 text-white/70';
        return (
          <li key={item.id} aria-current={state === 'active' ? 'step' : undefined}>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium sm:text-sm ${pill}`}>
              {state === 'done' ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TrackProgress({ step }: { step: ZenStep }) {
  const index = step === 'glow' ? STEPS.length : STEPS.findIndex((item) => item.id === step);
  return (
    <ol className="flex items-start" aria-label="Set my Zen progress">
      {STEPS.map((item, itemIndex) => {
        const done = itemIndex < index;
        const active = itemIndex === index;
        return (
          <li key={item.id} className="flex items-start" aria-current={active ? 'step' : undefined}>
            {itemIndex > 0 ? <span className={`mt-3 h-0.5 w-6 sm:w-10 ${itemIndex <= index ? 'bg-print' : 'bg-white/25'}`} /> : null}
            <span className="flex w-16 flex-col items-center gap-1 sm:w-20">
              <span className={`flex size-6 items-center justify-center rounded-full ${done || active ? 'bg-print text-white' : 'border border-white/30'}`}>
                {done ? <Check className="size-3.5" aria-hidden="true" /> : active ? <span className="size-2 rounded-full bg-white" /> : null}
              </span>
              <span className={`text-center text-[11px] leading-tight ${done || active ? 'text-white' : 'text-white/55'}`}>{item.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function MoveKicker({ label }: { label: string }) {
  const match = label.match(/(\d+)\s+of\s+(\d+)/);
  const current = match ? Number(match[1]) : 0;
  const total = match ? Number(match[2]) : 0;
  return (
    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1 text-sm font-medium text-white backdrop-blur-md">
      {label}
      {total > 0 ? (
        <span className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: total }, (_, dot) => (
            <span key={dot} className={`size-1.5 rounded-full ${dot < current ? 'bg-outline' : 'bg-white/35'}`} />
          ))}
        </span>
      ) : null}
    </p>
  );
}

function Dock({ chrome, reduced }: { chrome: ZenChrome; reduced: boolean }) {
  return (
    <footer className="mx-4 mb-3 mt-3 flex shrink-0 items-center gap-4 rounded-[20px] border border-white/12 bg-slate-900/70 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
        <DockIcon icon={chrome.icon ?? 'person'} fraction={chrome.holdFraction} />
      </span>
      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-2xl font-semibold leading-tight text-white">{chrome.title}</p>
        {chrome.helper ? <p className="line-clamp-2 text-base text-white/80">{chrome.helper}</p> : null}
        {chrome.holdFraction > 0 ? (
          <span className="mt-2 block h-0.5 max-w-sm overflow-hidden rounded-full bg-white/20">
            <span className="block h-full rounded-full bg-outline" style={{ width: `${Math.round(Math.min(1, chrome.holdFraction) * 100)}%` }} />
          </span>
        ) : null}
        {chrome.icon !== 'check' && chrome.chips && chrome.chips.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {chrome.chips.map((chip) => (
              <li key={chip.label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${chip.met ? 'bg-print text-white' : 'bg-white/10 text-white/70'}`}>
                {chip.met ? <Check className="size-3" aria-hidden="true" /> : null}
                {chip.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" className="h-12 rounded-full border border-white/80 px-5 text-lg font-semibold text-white" onClick={chrome.onBack}>
          {chrome.backLabel}
        </button>
        {chrome.skipLabel ? (
          <button type="button" className="h-12 rounded-full border border-white/80 px-5 text-lg font-semibold text-white" onClick={() => chrome.onSkip?.()}>
            {chrome.skipLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={`h-12 rounded-full bg-print px-6 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 ${chrome.pulseNext && !reduced ? 'dock-pulse-once' : ''}`}
          disabled={chrome.nextDisabled}
          onClick={chrome.onNext}
        >
          {chrome.nextLabel}
        </button>
      </div>
    </footer>
  );
}

function DockIcon({ icon, fraction }: { icon: ZenIcon; fraction: number }) {
  const ringed = fraction > 0 && (icon === 'lock' || icon === 'shoulders' || icon === 'neck' || icon === 'chin' || icon === 'breath');
  const glyph = <Glyph icon={icon} />;
  if (!ringed) return glyph;
  return (
    <span className="relative flex size-10 items-center justify-center">
      <HoldRing fraction={fraction} />
      <span className="absolute inset-0 flex items-center justify-center">{glyph}</span>
    </span>
  );
}

function Glyph({ icon }: { icon: ZenIcon }) {
  if (icon === 'shoulders' || icon === 'neck' || icon === 'chin' || icon === 'breath') {
    return <MoveIcon kind={icon} active reduced={false} light />;
  }
  if (icon === 'check') return <Check className="size-6" aria-hidden="true" />;
  if (icon === 'lock') return <Lock className="size-5" aria-hidden="true" />;
  if (icon === 'slouch') return <SeatedIcon />;
  return <PersonStanding className="size-6" aria-hidden="true" />;
}

function SeatedIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <circle cx="12" cy="4.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20.5v-2.5h8v2.5M6.5 14h11l1 4h-13zM9 14V9.5h6V14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function HoldRing({ fraction }: { fraction: number }) {
  const radius = 16;
  const lap = 2 * Math.PI * radius;
  const shown = Math.min(1, Math.max(0, fraction));
  return (
    <svg viewBox="0 0 40 40" className="size-10" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
      <circle cx="20" cy="20" r={radius} fill="none" stroke="var(--color-outline)" strokeWidth="3" strokeLinecap="round" strokeDasharray={lap} strokeDashoffset={lap * (1 - shown)} transform="rotate(-90 20 20)" />
    </svg>
  );
}
