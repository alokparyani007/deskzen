import { useEffect, useRef, useState } from 'react';
import { Shield } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { markGuestSetupPrompt } from '../auth/guestPrompt';
import { trackUsage } from '../../lib/usage/track';
import { useAuthSession } from '../../lib/auth';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLandmarks } from '../../hooks/useLandmarks';
import type { Baseline, Landmarks, NormPoint } from '../../lib/posture/types';
import { computeBaseline } from '../../lib/posture/baseline';
import { postureConfig } from '../../lib/posture/config';
import { loadVisionSession } from '../../lib/vision/session';
import { readPersonMaskFrom } from '../../lib/vision/segment';
import { readMulticlassPersonMask } from '../../lib/vision/multiclass';
import { traceSnapshot } from './snapshotTrace';
import { playLockIn, speakCaption, stopSpeech } from '../calibrate/glowVoice';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { CameraPausedBar } from '../print/CameraPausedBar';
import { PrivacyCard } from '../print/PrivacyCard';
import { printReturnPath } from '../print/printSteps';
import { ZEN_SET_VOICE } from '../print/zenSet';
import { CameraStage } from '../camera/CameraStage';
import { captureFrame, pictureIsGone, type CapturedFrame } from './captureFrame';
import { CheckChips } from './CheckChips';
import { formatZenDebug } from './debugLine';
import { DoneStep } from './DoneStep';
import { FitStep } from './FitStep';
import { fitScore, initialHold, smoothFit, stepHoldRing, type FitLandmarks } from './fitScore';
import { OutlineStep } from './OutlineStep';
import { OutlineSvg, useStageBox } from './OutlineSvg';
import { PostureSidePanel } from './PostureSidePanel';
import {
  activeTip,
  baselineFromMeasures,
  calloutForChip,
  EMPTY_HISTORY,
  JUST_YOU,
  liveRules,
  measurePose,
  medianBaseline,
  openingCopy,
  READY_COPY,
  rulesRecord,
  snapshotProblem,
  snapshotRules,
  STEP_IN_COPY,
  type PoseBaseline,
  type RuleResult,
} from './poseRules';
import { SnapOverlay } from './SnapStep';
import { shoulderTopsOnOutline, type OutlineReason, type SnapshotPixels } from './snapshotOutline';
import { usePersonOutline } from './usePersonOutline';
import { useSnapLoop } from './useSnapLoop';
import { DockButton, ZenDock } from './ZenDock';
import { buildZenV2, pointsFromFrame, saveZenPrint, type ZenV2 } from './zenPrint';
import { destinationAfterZen, openLiveView } from './afterZen';
import { rememberZenMode } from './liveMode';
import { StepPill, ZenStage } from './ZenStage';
import { zenConfig, type PoseMode } from './zenConfig';

type Step = 'snap' | 'outline' | 'fit' | 'done';

interface Shot {
  capture: CapturedFrame;
  frame: Landmarks | null;
  outline: NormPoint[] | null;
  reason: OutlineReason;
  rules: RuleResult[];
  forced: boolean;
  tracing: boolean;
}

interface Draft {
  outline: NormPoint[];
  baseline: PoseBaseline;
  points: ZenV2['points'];
  rules: RuleResult[];
  forced: boolean;
  frame: Landmarks;
  video: { width: number; height: number };
}

const MUTE_KEY = 'sitglow.glowMuted';
const STEPS = ['Get ready', 'Your outline', 'Fit and hold', 'Zen is set'] as const;

export function ZenFlowV2() {
  usePageTitle('Set my Zen');
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const mode: PoseMode = params.get('pose') === 'stand' ? 'stand' : 'sit';
  const from = params.get('from');
  const session = useAuthSession();
  const debugOn = params.get('debug') === '1';
  const backTo = printReturnPath(params.get('from'));
  const camera = useCamera();
  const { activeProfileId, save: saveSitBaseline, saveStanding: saveStandBaseline } = useBaseline();
  const live = camera.status === 'live';
  const [step, setStep] = useState<Step>('snap');
  const { landmarks, wallMs } = useLandmarks(camera.videoElement, live && step !== 'outline');
  const snap = useSnapLoop(landmarks, mode, live && step === 'snap');
  const [voice, setVoiceState] = useState(() => window.localStorage.getItem(MUTE_KEY) !== '1');
  const [shot, setShot] = useState<Shot | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<ZenV2 | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [fitShown, setFitShown] = useState<number | null>(null);
  const [holdFraction, setHoldFraction] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [clock, setClock] = useState(0);
  const opened = useRef(performance.now());
  const forcedRef = useRef(false);
  const shotRef = useRef<Shot | null>(null);
  const draftRef = useRef<Draft | null>(null);
  const voiceRef = useRef(voice);
  const spoken = useRef({ text: '', at: 0 });
  const holdRef = useRef(initialHold());
  const emaRef = useRef<number | null>(null);
  const goodRef = useRef<PoseBaseline[]>([]);
  const goodFramesRef = useRef<Landmarks[]>([]);
  const locking = useRef(false);
  const stage = useStageBox();
  voiceRef.current = voice;
  const outlineLive = usePersonOutline(camera.videoElement, landmarks, live && step === 'fit', zenConfig.live.fitSegHz, mode);

  const setVoice = (value: boolean) => {
    window.localStorage.setItem(MUTE_KEY, value ? '0' : '1');
    setVoiceState(value);
    if (!value) stopSpeech();
  };
  const say = (text: string, gapMs = 0) => {
    if (!voiceRef.current || !text) return;
    const now = Date.now();
    if (text === spoken.current.text && now - spoken.current.at < zenConfig.voiceTipMs) return;
    if (gapMs > 0 && now - spoken.current.at < gapMs) return;
    spoken.current = { text, at: now };
    speakCaption(text, false);
  };

  useEffect(() => {
    trackUsage('zen_started');
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  useEffect(() => {
    const id = window.setInterval(() => setClock(performance.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (live && step === 'snap') opened.current = performance.now();
  }, [live, step]);

  const wipe = () => {
    shotRef.current?.capture.dispose();
    shotRef.current = null;
    setShot(null);
  };

  const close = () => {
    wipe();
    camera.pause();
    navigate(backTo);
  };

  useEffect(() => () => {
    shotRef.current?.capture.dispose();
    shotRef.current = null;
  }, []);

  const take = (forced: boolean) => {
    const video = camera.videoElement;
    if (!video) return;
    const capture = captureFrame(video);
    if (!capture) return;
    const next: Shot = { capture, frame: null, outline: null, reason: 'ok', rules: [], forced, tracing: true };
    shotRef.current = next;
    setShot(next);
    setCount(null);
    forcedRef.current = false;
    setStep('outline');
  };
  const takeRef = useRef(take);
  takeRef.current = take;

  useEffect(() => {
    if (step !== 'snap') return;
    if (snap.board.allGreen && count === null) setCount(zenConfig.countdownSec);
    if (!snap.board.allGreen && count !== null && !forcedRef.current) setCount(null);
  }, [count, snap.board.allGreen, step]);

  useEffect(() => {
    if (count === null || step !== 'snap') return;
    playTick();
    const id = window.setTimeout(() => {
      setCount((current) => {
        if (current === null) return null;
        if (current <= 1) {
          takeRef.current(forcedRef.current);
          return null;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearTimeout(id);
  }, [count, step]);

  useEffect(() => {
    const current = shotRef.current;
    if (step !== 'outline' || !current?.tracing) return;
    let cancelled = false;
    void (async () => {
      const session = await loadVisionSession();
      if (cancelled || current.capture.canvas.width === 0) return;
      const detected = session.detectFrame(current.capture.canvas, current.capture.width, current.capture.height);
      const probes = [detected?.nose, detected?.leftShoulder, detected?.rightShoulder].filter((point): point is { x: number; y: number } => Boolean(point));
      const { canvas, width, height } = current.capture;
      // Multiclass person mask first (hair + skin + clothes leaves the chair out); the binary mask is the fallback.
      // The snapshot's own pixels (in memory only, never saved) also let the tracer check the shirt top.
      const traced = detected
        ? await traceSnapshot(
            {
              multiclass: () => readMulticlassPersonMask(canvas, width, height),
              binary: () => readPersonMaskFrom(canvas, width, height, probes),
            },
            detected,
            mode,
            snapshotPixels(canvas, width, height),
          )
        : { points: null, reason: 'trace-failed' as const };
      if (cancelled) return;
      const rules = detected ? snapshotRules(measurePose(detected), mode, { ...EMPTY_HISTORY, maxNeckRatio: detected ? measurePose(detected).neckRatio ?? 0 : 0 }) : [];
      const next: Shot = { ...current, frame: detected, outline: traced.points, reason: traced.reason, rules, tracing: false };
      shotRef.current = next;
      setShot(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, shot?.tracing, step]);

  useEffect(() => {
    if (step !== 'fit' || !draftRef.current || !landmarks || locking.current) return;
    const current = draftRef.current;
    const measures = measurePose(landmarks);
    const rules = liveRules(measures, current.baseline, mode);
    const computable = rules.filter((rule) => rule.pass !== null);
    const score = fitScore(
      { outline: current.outline, landmarks: savedMarks(current) },
      {
        outline: outlineLive.points,
        landmarks: liveMarks(measures),
        rulesPassed: computable.filter((rule) => rule.pass).length,
        rulesTotal: computable.length,
      },
    );
    const smoothed = smoothFit(emaRef.current, score.percent);
    emaRef.current = smoothed;
    setFitShown(smoothed === null ? null : Math.round(smoothed));
    const ring = stepHoldRing(holdRef.current, performance.now(), smoothed);
    holdRef.current = ring;
    setHoldFraction(ring.fraction);
    const sample = baselineFromMeasures(measures);
    if (sample && smoothed !== null && smoothed >= zenConfig.fitGood) {
      goodRef.current = [...goodRef.current, sample].slice(-40);
      goodFramesRef.current = [...goodFramesRef.current, landmarks].slice(-40);
    }
    if (ring.done) void finishRef.current(smoothed);
  }, [landmarks, mode, outlineLive.points, step]);

  const finish = async (fit: number | null) => {
    const current = draftRef.current;
    if (!current || locking.current) return;
    locking.current = true;
    const baseline = goodRef.current.length >= 10 ? medianBaseline(goodRef.current) ?? current.baseline : current.baseline;
    const zen = buildZenV2({
      mode,
      createdAt: new Date().toISOString(),
      video: current.video,
      outline: current.outline,
      baseline,
      points: current.points,
      rulesAtSnap: rulesRecord(current.rules),
      forced: current.forced,
      fitAtLock: fit === null ? null : Math.round(fit),
    });
    wipe();
    if (!pictureIsGone(shotRef.current?.capture ?? null)) wipe();
    try {
      await saveZenPrint({ zen, frame: current.frame, deskProfileId: activeProfileId, deviceLabel: cameraLabel(camera.devices, camera.deviceId) });
      trackUsage('zen_saved');
      const numbers = legacyBaseline(goodFramesRef.current, current.frame);
      if (numbers) {
        try {
          await (mode === 'stand' ? saveStandBaseline({ ...numbers, pose: 'stand' }) : saveSitBaseline({ ...numbers, pose: 'sit' }));
        } catch {
          // The Zen print is saved. Spot checks pick up the numbers on the next Set my Zen.
        }
      }
      playLockIn();
      say('Locked.');
      if (!session) markGuestSetupPrompt();
      rememberZenMode(mode);
      if (destinationAfterZen({ signedIn: Boolean(session), from }) === '/live') {
        openLiveView(navigate, true);
        return;
      }
      setSaved(zen);
      setStep('done');
    } catch {
      locking.current = false;
    }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (step === 'snap') {
      const tip = activeTip(snap.rules, snap.board.activeChip, true, mode);
      say(snap.away ? STEP_IN_COPY.title : snap.board.allGreen ? 'Perfect. Hold still.' : tip?.title ?? "Let's set your Zen. Match the picture on the right.");
    }
  }, [mode, snap.away, snap.board.activeChip, snap.board.allGreen, snap.rules, step, voice]);

  useEffect(() => {
    if (step === 'outline' && shot && !shot.tracing) {
      const problem = snapshotProblem(shot.rules, shot.reason, true);
      say(problem?.title ?? "That's your outline. Look right?");
    }
    if (step === 'fit') say('Great, hold right there.');
    if (step === 'done') say(ZEN_SET_VOICE);
  }, [shot, step, voice]);

  const flow = useRef({ close: () => {}, back: () => {}, primary: () => {} });
  flow.current.close = close;
  flow.current.back = close;
  flow.current.primary = () => {};

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === 'Escape') flow.current.close();
      if (event.key === 'Enter') flow.current.primary();
      if (event.key === 'Backspace') {
        event.preventDefault();
        flow.current.back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setMode = (next: PoseMode) => {
    const copy = new URLSearchParams(params);
    copy.set('pose', next);
    setParams(copy, { replace: true });
  };

  if (!live && camera.status !== 'paused') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stage p-6">
        <div className="rounded-3xl border border-white/10 bg-[#0f261d] text-white shadow-2xl">
          <PrivacyCard status={camera.status} errorName={camera.errorName} onStart={() => void camera.start()} onLeave={() => navigate(backTo)} />
        </div>
      </div>
    );
  }

  const ready = clock - opened.current >= zenConfig.forcePictureMs;
  const snapCopy = snap.away ? STEP_IN_COPY : snap.board.allGreen ? { ...READY_COPY, helper: `Taking your picture in ${count ?? zenConfig.countdownSec}…` } : (activeTip(snap.rules, snap.board.activeChip, true, mode) ?? openingCopy());
  const problem = shot && !shot.tracing ? snapshotProblem(shot.rules, shot.reason, true) : null;
  const debug = debugOn
    ? formatZenDebug({
        frame: landmarks,
        mode,
        print: saved ? 'v3' : draft ? 'v3' : 'no',
        fit: fitShown,
        parts: null,
        measures: snap.measures ?? (landmarks ? measurePose(landmarks) : null),
        baselineNeck: draft?.baseline.neckRatio ?? null,
        baselineFace: draft?.baseline.faceShoulderRatio ?? null,
        phase: step,
        segHz: outlineLive.hz,
      })
    : null;

  const keep = () => {
    if (!shot?.frame || !shot.outline) return;
    const measures = measurePose(shot.frame);
    const baseline = baselineFromMeasures(measures) ?? looseBaseline(measures);
    const points = pointsFromFrame(shot.frame);
    if (!baseline || !points) return;
    const next: Draft = {
      outline: shot.outline,
      baseline,
      points,
      rules: shot.rules,
      forced: shot.forced,
      frame: shot.frame,
      video: { width: shot.capture.width, height: shot.capture.height },
    };
    draftRef.current = next;
    setDraft(next);
    goodRef.current = [];
    goodFramesRef.current = [];
    holdRef.current = initialHold();
    emaRef.current = null;
    locking.current = false;
    wipe();
    setStep('fit');
  };
  flow.current.back = () => {
    if (step === 'outline') { wipe(); setStep('snap'); return; }
    if (step === 'fit') { setStep('snap'); return; }
    if (step === 'done') { setSaved(null); setStep('snap'); return; }
    close();
  };
  flow.current.primary = () => {
    if (step === 'snap' && (snap.board.allGreen || ready)) {
      forcedRef.current = !snap.board.allGreen;
      setCount(zenConfig.countdownSec);
    } else if (step === 'outline' && shot && !shot.tracing) {
      if (problem) { wipe(); setStep('snap'); } else keep();
    } else if (step === 'fit') void finishRef.current(fitShown);
    else if (step === 'done') openLiveView(navigate);
  };

  return (
    <ZenStage
      center={<StepPill label={`Step ${STEPS.indexOf(stepName(step)) + 1} of 4 · ${stepName(step)}`} />}
      onClose={close}
      voice={voice}
      onVoice={setVoice}
      showVoice
      debug={debug}
    >
      {step === 'done' && saved ? (
        <DoneStep outline={saved.outline} mode={saved.mode} video={saved.video} />
      ) : (
        <div className={`grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-[2%] px-[2%] ${step === 'snap' ? 'grid-cols-[minmax(0,68fr)_minmax(280px,30fr)]' : 'grid-cols-1'}`}>
          <div ref={stage.ref} className="relative h-full min-h-0 overflow-hidden rounded-2xl bg-black">
            {step === 'outline' && shot ? (
              <OutlineStep capture={shot.capture} outline={shot.outline} marks={shot.tracing ? null : outlineMarks(shot.frame, shot.outline)} badges={shot.tracing ? [] : snapBadges(shot, mode)} />
            ) : (
              <>
                <CameraStage landmarks={landmarks} alignment={null} showGuides={false} showLandmarks={false} frame="fill" chrome="bare" />
                {step === 'snap' ? (
                  <SnapOverlay countdown={count} videoWidth={landmarks?.videoWidth || camera.resolution?.width || 1280} videoHeight={landmarks?.videoHeight || camera.resolution?.height || 720} viewWidth={stage.width} viewHeight={stage.height} dots={dotsFrom(landmarks)} />
                ) : null}
                {step === 'fit' && draft ? (
                  <OutlineSvg
                    saved={draft.outline}
                    videoWidth={landmarks?.videoWidth || draft.video.width}
                    videoHeight={landmarks?.videoHeight || draft.video.height}
                    viewWidth={stage.width}
                    viewHeight={stage.height}
                  />
                ) : null}
                {step === 'fit' ? <FitStep fraction={holdFraction} fit={fitShown} /> : null}
                {step === 'snap' ? (
                  <div className="absolute inset-x-3 top-3">
                    <CheckChips chips={snap.board.chips} mode={mode} />
                  </div>
                ) : null}
                {step === 'snap' && snap.rules.some((rule) => rule.id === 'R13' && rule.pass === false) ? <FramingPill text={JUST_YOU} /> : null}
              </>
            )}
          </div>
          {step === 'snap' ? (
            <PostureSidePanel mode={mode} active={snap.board.allGreen ? null : calloutForChip(snap.board.activeChip)} reduced={reduced} onMode={setMode} />
          ) : null}
        </div>
      )}
      {step === 'snap' ? (
        <ZenDock tone={snap.board.allGreen ? 'ready' : 'coach'} title={snapCopy.title} helper={snapCopy.helper} note={!snap.board.allGreen && ready ? "Some checks aren't green yet. Your outline may be less accurate." : null} hold={snap.board.activeChip && !snap.board.allGreen ? chipHold(snap.board) : null}>
          <DockButton onClick={close}>Back</DockButton>
          <DockButton primary disabled={!snap.board.allGreen && !ready} onClick={() => { forcedRef.current = !snap.board.allGreen; setCount(zenConfig.countdownSec); }}>
            Take picture
          </DockButton>
        </ZenDock>
      ) : null}
      {step === 'outline' ? (
        <ZenDock tone={shot?.tracing ? 'wait' : problem ? 'coach' : 'good'} title={shot?.tracing ? 'Tracing your outline…' : problem?.title ?? "That's your outline"} helper={shot?.tracing ? 'This stays on your device.' : problem?.helper ?? (mode === 'stand' ? 'This is how you stand at your best. Look right?' : 'This is how you sit at your best. Look right?')}>
          <DockButton primary={Boolean(problem)} onClick={() => { wipe(); setStep('snap'); }}>Retake</DockButton>
          {problem ? null : (
            <DockButton primary disabled={!shot || shot.tracing || !shot.outline} onClick={keep}>Looks good</DockButton>
          )}
          {problem?.allowAnyway ? (
            <button type="button" className="text-sm font-semibold text-white/80 underline" onClick={keep}>
              Use it anyway
            </button>
          ) : null}
        </ZenDock>
      ) : null}
      {step === 'done' ? (
        <ZenDock
          tone="good"
          title="Your Zen is set"
          helper="Live view will guide you back."
          aside={
            <p className="inline-flex items-center gap-2 text-sm text-white/75">
              <Shield className="size-4 shrink-0" aria-hidden="true" />
              Picture deleted. Only your outline is kept.
            </p>
          }
        >
          <DockButton onClick={() => { setSaved(null); setStep('snap'); }}>Retake</DockButton>
          <DockButton primary onClick={() => openLiveView(navigate)}>Start Live view</DockButton>
        </ZenDock>
      ) : null}
      <CameraPausedBar live={live} video={camera.videoElement} lastLandmarkMs={wallMs} />
    </ZenStage>
  );
}

function FramingPill({ text }: { text: string }) {
  return <p className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-sm text-white backdrop-blur-md">{text}</p>;
}

/**
 * Step 2 markers, normalized and unmirrored like the outline. The shoulder dots sit ON the traced
 * outline's shoulder top (the landmarks land low on the upper chest); landmarks are only the fallback.
 */
function outlineMarks(frame: Landmarks | null, outline: readonly NormPoint[] | null = null): { left: NormPoint; right: NormPoint; chin: NormPoint | null } | null {
  if (!frame || frame.videoWidth <= 0 || frame.videoHeight <= 0 || !frame.leftShoulder || !frame.rightShoulder) return null;
  const norm = (point: { x: number; y: number }) => ({ x: point.x / frame.videoWidth, y: point.y / frame.videoHeight });
  const box = frame.faceBox;
  const chin = frame.chin ? norm(frame.chin) : box ? { x: box.x + box.w / 2, y: box.y + box.h } : null;
  const tops = shoulderTopsOnOutline(outline, frame);
  return { left: tops?.left ?? norm(frame.leftShoulder), right: tops?.right ?? norm(frame.rightShoulder), chin };
}

/** Read the snapshot canvas pixels for tracing. In memory only: never stored, encoded or sent anywhere. */
function snapshotPixels(canvas: OffscreenCanvas | HTMLCanvasElement, width: number, height: number): SnapshotPixels | null {
  try {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
    return ctx ? ctx.getImageData(0, 0, width, height) : null;
  } catch {
    return null;
  }
}

function stepName(step: Step): (typeof STEPS)[number] {
  if (step === 'outline') return 'Your outline';
  if (step === 'fit') return 'Fit and hold';
  if (step === 'done') return 'Zen is set';
  return 'Get ready';
}

function chipHold(board: { chips: { status: string; passSince: number | null }[] }): number | null {
  const active = board.chips.find((chip) => chip.status === 'active');
  if (!active?.passSince) return null;
  return Math.max(0, Math.min(1, (performance.now() - active.passSince) / zenConfig.chipHoldMs));
}

function dotsFrom(frame: Landmarks | null): NormPoint[] {
  if (!frame || frame.videoWidth <= 0 || frame.videoHeight <= 0) return [];
  const point = (value?: { x: number; y: number }) => (value ? { x: value.x / frame.videoWidth, y: value.y / frame.videoHeight } : null);
  const mid = frame.leftShoulder && frame.rightShoulder
    ? { x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2 / frame.videoWidth, y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2 / frame.videoHeight }
    : null;
  return [point(frame.leftEye), point(frame.rightEye), point(frame.leftShoulder), point(frame.rightShoulder), mid].filter((item): item is NormPoint => item !== null);
}

function savedMarks(draft: Draft): FitLandmarks {
  return {
    nose: draft.points.nose,
    eyeMid: { x: (draft.points.leftEye.x + draft.points.rightEye.x) / 2, y: (draft.points.leftEye.y + draft.points.rightEye.y) / 2 },
    leftShoulder: draft.points.leftShoulder,
    rightShoulder: draft.points.rightShoulder,
    shoulderWidth: draft.baseline.shoulderWidth,
  };
}

function liveMarks(measures: ReturnType<typeof measurePose>): FitLandmarks {
  return {
    nose: measures.noseX !== null && measures.noseY !== null ? { x: measures.noseX, y: measures.noseY } : null,
    eyeMid: measures.eyeMidX !== null && measures.eyeMidY !== null ? { x: measures.eyeMidX, y: measures.eyeMidY } : null,
    leftShoulder: measures.leftShoulderX !== null && measures.leftShoulderY !== null ? { x: measures.leftShoulderX, y: measures.leftShoulderY } : null,
    rightShoulder: measures.rightShoulderX !== null && measures.rightShoulderY !== null ? { x: measures.rightShoulderX, y: measures.rightShoulderY } : null,
    shoulderWidth: measures.shoulderWidth,
  };
}

function looseBaseline(measures: ReturnType<typeof measurePose>): PoseBaseline | null {
  if (measures.shoulderMidX === null || measures.shoulderMidY === null || measures.shoulderWidth === null) return null;
  return {
    shoulderMidX: measures.shoulderMidX,
    shoulderMidY: measures.shoulderMidY,
    shoulderWidth: measures.shoulderWidth,
    faceWidth: measures.faceWidth ?? 0.16,
    noseOffset: measures.noseOffset ?? 0,
    neckRatio: measures.neckRatio ?? zenConfig.neckRatioMin,
    faceShoulderRatio: measures.faceShoulderRatio ?? 0.4,
    shoulderRollDeg: measures.shoulderTiltDeg ?? 0,
    headRollDeg: measures.headRollDeg ?? 0,
    eyeLineY: measures.eyeMidY ?? zenConfig.eyeGuideY,
    pitchDeg: measures.pitchDeg ?? undefined,
    yawDeg: measures.yawDeg ?? undefined,
    distanceIn: measures.distanceIn ?? undefined,
  };
}

function cameraLabel(devices: { deviceId: string; label: string }[], deviceId: string): string {
  const label = devices.find((device) => device.deviceId === deviceId)?.label ?? '';
  return label.slice(0, 40);
}

function playTick(): void {
  try {
    const audio = new AudioContext();
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = 880;
    gain.gain.value = 0.03;
    tone.connect(gain).connect(audio.destination);
    tone.start();
    tone.stop(audio.currentTime + 0.05);
    tone.onended = () => void audio.close();
  } catch {
    /* A missing speaker should not block the picture. */
  }
}

function passed(rules: readonly RuleResult[], ids: string[]): boolean {
  const mine = rules.filter((rule) => ids.includes(rule.id) && rule.pass !== null);
  return mine.length > 0 && mine.every((rule) => rule.pass === true);
}

/** Step 2 badges from the snapshot landmarks (Head centered, Both shoulders, Sitting tall, Good distance). */
function snapBadges(shot: { rules: RuleResult[]; reason: OutlineReason }, mode: PoseMode): { label: string; pass: boolean }[] {
  return [
    { label: 'Head centered', pass: passed(shot.rules, ['R2', 'R3', 'R4', 'R5', 'R6']) },
    { label: 'Both shoulders', pass: passed(shot.rules, ['R7', 'R8', 'R9']) },
    { label: mode === 'stand' ? 'Standing tall' : 'Sitting tall', pass: passed(shot.rules, ['R10', 'R11']) },
    { label: 'Good distance', pass: shot.reason !== 'shoulder-cut' && passed(shot.rules, ['R12', 'R12b', 'R12c']) },
  ];
}

/**
 * Spot checks, posture nudges, Home and Settings read the numeric baseline (numbers only, no picture),
 * so Set my Zen saves one beside the Zen print. Live frames from the fit step first; the snapshot
 * landmarks are the fallback.
 */
function legacyBaseline(frames: readonly Landmarks[], still: Landmarks): Baseline | null {
  const live = computeBaseline([...frames]);
  if (live.ok) return live.baseline;
  const fromStill = computeBaseline(Array.from({ length: postureConfig.calibration.minSamples }, () => still));
  return fromStill.ok ? fromStill.baseline : null;
}
