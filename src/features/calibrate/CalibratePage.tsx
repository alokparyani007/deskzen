import { Link, useSearchParams } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';
import { DeviceLock } from '../../components/DeviceLock';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLandmarks } from '../../hooks/useLandmarks';
import { calibrationNeeded } from '../../lib/settings/visibility';
import { CameraStage } from '../camera/CameraStage';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';
import { BalanceBubble } from './BalanceBubble';
import { DeskProfileBar } from './DeskProfileBar';
import { GlowIntro } from './GlowIntro';
import { GlowUpReveal } from './GlowUpReveal';
import { posturePrintV2Enabled } from '../../calibration/flag';
import { PrintFlow } from '../print/PrintFlow';
import { useGuidedGlow, type GlowMode } from './useGuidedGlow';

export function CalibratePage() {
  const [params] = useSearchParams();
  const pose = params.get('pose') === 'stand' ? 'stand' : 'sit';
  const mode = params.get('recheck') === '1' ? 'recheck' : params.get('check') === '1' ? 'check' : params.get('tune') === '1' ? 'tune' : 'full';
  if (posturePrintV2Enabled() && pose === 'sit' && mode === 'full') return <PrintFlow />;
  return <ClassicGlow />;
}

function ClassicGlow() {
  usePageTitle('Set my Zen');
  const { status, errorName, start, videoElement } = useCamera();
  const { landmarks, visionStatus, visionError } = useLandmarks(videoElement, status === 'live');
  const { save, saveStanding, restore, baseline, standing, history, profiles, activeProfileId, selectProfile } = useBaseline();
  const { settings } = useSession();
  const [params] = useSearchParams();
  const pose: 'sit' | 'stand' = params.get('pose') === 'stand' ? 'stand' : 'sit';
  const mode: GlowMode = params.get('recheck') === '1' ? 'recheck' : params.get('check') === '1' ? 'check' : params.get('tune') === '1' ? 'tune' : 'full';
  const existing = pose === 'stand' ? standing : baseline;
  const glow = useGuidedGlow(pose, mode, status === 'live' ? landmarks : null, status === 'live' && visionStatus === 'ready', existing, save, saveStanding);
  const next = calibrationNeeded(settings.workStyle, pose === 'sit' ? true : Boolean(baseline), pose === 'stand' ? true : Boolean(standing));

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col px-4 pb-4 pt-14 lg:px-6 lg:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-brand sm:text-3xl">Set my Zen</h1>
        <p className="mt-1 text-sm text-ink-muted">About 45 seconds. We'll learn your best posture and save your Posture Print.</p>
        <DeviceLock />
      </div>
      <p className="mt-1 max-w-xl text-sm text-ink-muted">
        {pose === 'stand' ? 'A short reset, then we save your standing Glow.' : 'A short reset. You do not have to judge it yourself.'}
      </p>
      <div className="mt-3">
        <DeskProfileBar profiles={profiles} activeId={activeProfileId} onSelect={(id) => void selectProfile(id)} />
      </div>

      {status === 'live' ? (
        <div className="relative mt-4">
          <CameraStage
            landmarks={landmarks}
            alignment={null}
            showGuides={false}
            showLandmarks={false}
            badgeAt="top"
            status={visionError ?? (visionStatus === 'loading' ? 'Getting the on-device model ready…' : null)}
          />
          {glow.phase === 'guide' || glow.phase === 'locked' ? (
            <>
              <BalanceBubble orb={glow.orb} progress={glow.ringProgress} paused={glow.ringPaused} shouldersOk={glow.shouldersOk} />
              <div className="absolute bottom-4 left-1/2 z-10 flex w-[min(28rem,92%)] -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lg">
                <p className="min-w-0 flex-1 text-sm font-semibold text-ink" aria-live="polite">
                  <span className="mb-0.5 block text-xs font-medium text-ink-muted">
                    {glow.stepIndex} of {glow.stepCount}
                  </span>
                  {glow.caption}
                </p>
                <button type="button" className="rounded-full p-2 text-ink" aria-pressed={glow.muted} aria-label={glow.muted ? 'Unmute guidance' : 'Mute guidance'} onClick={glow.toggleMute}>
                  {glow.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>
              </div>
            </>
          ) : null}
          {glow.phase === 'locked' ? (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" role="status">
              <span className="glow-burst absolute size-40 rounded-full bg-glow/40" />
              <p className="rounded-full bg-white px-5 py-3 text-lg font-semibold text-ink shadow-lg">Locked in!</p>
            </div>
          ) : null}
          {glow.phase === 'reveal' && glow.saved ? (
            <GlowUpReveal
              before={glow.before}
              glow={glow.saved}
              lightOk={glow.lightOk}
              next={next}
              history={history[pose]}
              onRestore={(createdAt) => void restore(pose, createdAt)}
            />
          ) : null}
          {glow.phase === 'help' ? <Help onRetry={glow.retry} /> : null}
          {glow.phase === 'checked' || glow.phase === 'shifted' ? <CheckNote ok={glow.phase === 'checked'} pose={pose} /> : null}
        </div>
      ) : (
        <GlowIntro
          status={status}
          errorName={errorName}
          onStart={() => void start()}
          tips={pose === 'stand' ? ['Feet hip-width', 'Weight over both feet', 'Screen at eye level'] : undefined}
        />
      )}
      <p className="mt-4 text-xs text-ink-muted">DeskZen is a wellness tool, not a medical device.</p>
    </section>
  );
}

function Help({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="absolute inset-x-4 bottom-4 z-10 rounded-2xl bg-white p-4 text-center shadow-lg" role="status">
      <p className="text-sm font-medium text-ink">Having trouble? Try more light, then hold still in the ring.</p>
      <button type="button" className="mt-3 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function CheckNote({ ok, pose }: { ok: boolean; pose: 'sit' | 'stand' }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 p-4" role="status">
      <div className="max-w-sm rounded-3xl bg-white px-6 py-8 text-center shadow-lg">
        <p className="text-lg font-semibold text-ink">{ok ? 'Your Zen is set' : 'Moved your desk or chair? Set your Zen again.'}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {ok ? null : (
            <Link to={`/calibrate?pose=${pose}`} className="rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white">
              Set my Zen
            </Link>
          )}
          <Link to="/app" className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-ink">
            {ok ? 'Back home' : 'Not now'}
          </Link>
        </div>
        <div className="mt-4 flex justify-center">
          <DeviceLock />
        </div>
      </div>
    </div>
  );
}
