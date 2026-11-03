import { ArrowLeft, ArrowRight, Maximize2, Pause, ScanLine, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { usePageTitle } from '../../hooks/usePageTitle';
import { shoulderObjectPosition } from '../../lib/vision/toScreen';
import { CameraDenied } from '../camera/CameraDenied';
import { CameraStage } from '../camera/CameraStage';
import { SetZenCard } from './InstructionCard';
import { InstructionBar } from './InstructionBar';
import { LiveOverlay } from './LiveOverlay';
import { LiveSidePanel } from './LiveSidePanel';
import { MatchPill } from './MatchRing';
import { useLiveWire } from './useLiveWire';

export function LiveViewPage() {
  usePageTitle('Live view');
  const wire = useLiveWire();
  const stageRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const cameraOn = wire.live || wire.cameraStatus === 'requesting';
  const showScore = wire.live && wire.shown === 'ok' && wire.percent !== null && Boolean(wire.print) && !wire.framing;
  const showDock = Boolean(wire.bar) && !wire.framing;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!focused || event.key !== 'Escape') return;
      event.preventDefault();
      setFocused(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);

  const video = (
    <div
      ref={stageRef}
      className={focused
        ? 'relative min-h-0 flex-1 overflow-hidden rounded-3xl bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]'
        : 'relative min-h-0 flex-1 overflow-hidden rounded-[28px] border-[10px] border-ink bg-black shadow-[0_20px_60px_rgba(0,0,0,0.35)]'}
    >
      {cameraOn ? (
        <CameraStage
          landmarks={wire.landmarks}
          alignment={null}
          baseline={null}
          showGhost={false}
          showLandmarks={false}
          frame="live"
          chrome="bare"
          objectPosition={shoulderObjectPosition(wire.landmarks)}
        >
          {wire.print ? <LiveOverlay modelRef={wire.modelRef} /> : null}
          {showScore && wire.percent !== null && !focused ? <MatchPill percent={wire.percent} /> : null}
          {wire.live && !focused ? <HdPill hd={wire.hd} /> : null}
          {wire.live && wire.framing ? <FramingPill title={wire.framing} /> : null}
          {wire.toast ? <ZenToast /> : null}
          {showDock && wire.bar && !focused ? (
            <div className="absolute inset-x-3 bottom-3 z-20">
              <InstructionBar chip={wire.bar} cue={wire.cue} memory={wire.guideMemory} hold={wire.hold} showSteps={wire.showSteps} />
            </div>
          ) : null}
          {focused ? null : (
            <button
              type="button"
              className="absolute right-3 top-3 z-30 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-white backdrop-blur-md"
              aria-label="Focus"
              onClick={() => setFocused(true)}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
            </button>
          )}
          {wire.printReady && !wire.print ? <div className="absolute inset-0 z-10 bg-ink/35" aria-hidden="true" /> : null}
          {wire.printReady && !wire.print ? <SetZenCard pose={wire.poseMode} floating /> : null}
        </CameraStage>
      ) : null}
      {!cameraOn && !wire.printReady ? <div className="h-full w-full rounded-3xl bg-stage" /> : null}
      {!cameraOn && wire.printReady && !wire.print ? (
        <div className="flex h-full items-center justify-center p-6">
          <SetZenCard pose={wire.poseMode} />
        </div>
      ) : null}
      {!cameraOn && wire.printReady && wire.print ? (
        <div className="flex h-full flex-col items-start justify-center p-6">
          {wire.cameraStatus === 'denied' || wire.cameraStatus === 'unavailable' ? (
            <CameraDenied errorName={wire.errorName} onRetry={() => void wire.start()} />
          ) : (
            <>
              <p className="max-w-sm text-sm text-white/80">See your posture live. Your video never leaves this device.</p>
              <button type="button" className="mt-4 rounded-full bg-print px-4 py-2.5 text-sm font-semibold text-white" onClick={() => void wire.start()}>
                Turn on camera
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );

  const controls = (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {wire.live ? (
        <button type="button" className="flex size-11 items-center justify-center rounded-full bg-surface text-ink" aria-label="Pause camera" onClick={wire.pause}>
          <Pause className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <button type="button" role="switch" aria-checked={wire.sound} className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={wire.toggleSound}>
        Voice {wire.sound ? 'on' : 'off'}
        <span className={`relative h-5 w-9 rounded-full ${wire.sound ? 'bg-print' : 'bg-ink/20'}`} aria-hidden="true">
          <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${wire.sound ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </span>
      </button>
      <div className="inline-flex rounded-full bg-surface p-1" role="group" aria-label="Sitting or standing">
        <ModeChip pressed={wire.posture === 'sitting' && wire.postureManual} onClick={() => wire.choosePosture('sitting')}>Sitting</ModeChip>
        <ModeChip pressed={wire.posture === 'standing' && wire.postureManual} onClick={() => wire.choosePosture('standing')}>Standing</ModeChip>
        <ModeChip pressed={!wire.postureManual} onClick={wire.followPosture}>Auto</ModeChip>
      </div>
      {wire.print ? (
        <button
          type="button"
          className={wire.guiding
            ? 'rounded-full border border-ink/20 bg-white px-5 py-2.5 text-base font-semibold text-ink'
            : 'rounded-full bg-print px-5 py-2.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted'}
          disabled={!wire.guiding && !wire.canGuide}
          onClick={wire.guiding ? wire.stopGuide : wire.onGuide}
        >
          {wire.guiding ? 'Stop guide' : 'Guide me back'}
        </button>
      ) : (
        <button type="button" className="rounded-full bg-surface px-5 py-2.5 text-base font-semibold text-ink-muted" disabled>
          Guide me back
        </button>
      )}
    </div>
  );

  if (focused) {
    return (
      <section className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-stage px-4 py-3 text-white">
        <header className="mb-3 flex h-14 shrink-0 items-center gap-2">
          <Logo tone="onBrand" />
          <div className="flex flex-1 justify-center">
            {showScore && wire.percent !== null ? <MatchPill percent={wire.percent} floating={false} /> : null}
          </div>
          <button type="button" role="switch" aria-checked={wire.sound} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-medium backdrop-blur-md" onClick={wire.toggleSound}>
            <span className={`size-2 rounded-full ${wire.sound ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
            Voice {wire.sound ? 'on' : 'off'}
          </button>
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-medium backdrop-blur-md">
            <span className={`size-2 rounded-full ${wire.hd ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
            HD camera
          </span>
          <button type="button" className="flex size-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/70" aria-label="Close focus" onClick={() => setFocused(false)}>
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        {video}
        <footer className={`mt-3 flex shrink-0 items-center gap-3 rounded-[20px] border border-white/12 px-4 py-3 backdrop-blur-md ${wire.bar?.tone === 'zen' ? 'bg-print' : 'bg-slate-900/72'}`}>
          <div className="min-w-0 flex-1">
            {wire.bar ? <InstructionBar bare chip={wire.bar} cue={wire.cue} memory={wire.guideMemory} hold={wire.hold} showSteps={wire.showSteps} /> : <p className="text-white/80">Match the green outline.</p>}
          </div>
          <button type="button" className="h-12 shrink-0 rounded-full border border-white/80 px-5 text-base font-semibold" onClick={() => setFocused(false)}>
            Exit focus
          </button>
          <button
            type="button"
            className="h-12 shrink-0 rounded-full bg-print px-5 text-base font-semibold text-white disabled:opacity-50"
            disabled={!wire.guiding && !wire.canGuide}
            onClick={wire.guiding ? wire.stopGuide : wire.onGuide}
          >
            {wire.guiding ? 'Stop guide' : 'Guide me back'}
          </button>
        </footer>
      </section>
    );
  }

  return (
    <section className="flex h-[calc(100dvh-5.5rem)] flex-col overflow-hidden px-4 py-3 lg:h-[calc(100dvh-1rem)] lg:px-6">
      <h1 className="sr-only">Live view</h1>
      {wire.visionError ? <p className="mb-2 text-sm text-ink" role="alert">{wire.visionError}</p> : null}
      {wire.visionStatus === 'loading' ? <p className="mb-2 text-sm text-ink-muted">Getting the on-device model ready…</p> : null}
      <div className="grid min-h-0 flex-1 items-stretch gap-4 min-[1280px]:grid-cols-[minmax(0,3fr)_minmax(220px,280px)]">
        <div className="flex min-h-0 min-w-0 flex-col">
          {video}
          {wire.shoulderWait ? <p className="mt-2 text-sm text-ink-muted">I&apos;ll coach you once I can see both shoulders.</p> : null}
          {wire.debug ? <p className="mt-1 truncate font-mono text-[11px] text-ink-muted">{wire.debug}</p> : null}
          {controls}
        </div>
        <aside className="hidden min-h-0 overflow-auto min-[1280px]:block">
          <LiveSidePanel
            ready={Boolean(wire.print) && wire.live && wire.shown === 'ok' && !wire.shoulderWait}
            estimated={wire.estimated}
            hasPrint={Boolean(wire.print)}
            drift={wire.drift}
            bounces={wire.bounces}
            pose={wire.poseMode}
            waiting={wire.shoulderWait ? 'Waiting for both shoulders' : null}
          />
        </aside>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 min-[1280px]:hidden">
        <span className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-ink">Bounced back {wire.bounces}</span>
        <Link to={`/set-my-zen?pose=${wire.poseMode}&from=live`} className="rounded-full border border-print px-3 py-1 text-sm font-semibold text-print">Set my Zen</Link>
      </div>
    </section>
  );
}

function ModeChip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={pressed} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${pressed ? 'bg-brand-tint text-print' : 'text-ink'}`} onClick={onClick}>
      {children}
    </button>
  );
}

function HdPill({ hd }: { hd: boolean }) {
  return (
    <span className="absolute right-16 top-3 z-20 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-slate-900/80 px-2 py-1.5 text-[11px] font-bold tracking-wide text-white backdrop-blur-md">
      <span className={`size-1.5 rounded-full ${hd ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
      <span className="sr-only">Camera on. </span>
      {hd ? 'HD' : 'Live'}
    </span>
  );
}

function FramingPill({ title }: { title: string }) {
  const Icon = title.includes('right') ? ArrowRight : title.includes('left') ? ArrowLeft : ScanLine;
  return (
    <p className="absolute left-1/2 top-3 z-20 flex max-w-[70%] -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {title}
    </p>
  );
}

function ZenToast() {
  return (
    <p className="pointer-events-none absolute bottom-28 left-1/2 z-30 -translate-x-1/2 rounded-full bg-print px-4 py-2 text-sm font-semibold text-white" role="status">
      Nice! That&apos;s your Zen
    </p>
  );
}
