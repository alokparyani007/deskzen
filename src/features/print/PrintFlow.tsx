import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { aggregateFrames } from '../../calibration/aggregate';
import { lockMaySave } from '../../calibration/lockCoach';
import { setupCheck } from '../../calibration/setupCheck';
import type { FeatureBundle } from '../../calibration/print';
import { computeBaseline } from '../../lib/posture/baseline';
import type { Landmarks } from '../../lib/posture/types';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLandmarks } from '../../hooks/useLandmarks';
import { speakCaption } from '../calibrate/glowVoice';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { CatchStep } from './CatchStep';
import { CameraPausedBar } from './CameraPausedBar';
import { GlowUpStep } from './GlowUpStep';
import { confidenceFromLock, frameStillness, frameVisibility, lightingPart } from './glowStats';
import { LockStep, type LockResult } from './LockStep';
import { PrivacyCard } from './PrivacyCard';
import { ResetStep } from './ResetStep';
import { saveSittingPrint } from './savePrint';
import { readLight } from './readLight';
import { measureLighting, type LightingRead } from './lighting';
import { SetupStep } from './SetupStep';
import { printReturnPath } from './printSteps';
import { anchorsFromLandmarks, outlineFromMasks, sampleContour, silhouetteFromContours } from './contourSample';
import type { MaskGrid } from '../../lib/posture/silhouette';
import { ZEN_SET_VOICE } from './zenSet';
import type { Point, Silhouette } from '../../lib/posture/silhouette';
import { ImmersiveStage } from './ImmersiveStage';

type Step = 'privacy' | 'setup' | 'reset' | 'lock' | 'catch' | 'glow';

export function PrintFlow() {
  usePageTitle('Set my Zen');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const backTo = printReturnPath(params.get('from'));
  const camera = useCamera();
  const { save, activeProfileId } = useBaseline();
  const live = camera.status === 'live';
  const [step, setStep] = useState<Step>(live ? 'setup' : 'privacy');
  const [light, setLight] = useState<ReturnType<typeof readLight>>(undefined);
  const [lighting, setLighting] = useState<LightingRead>({ great: true, text: 'Lighting: great' });
  const [zen, setZen] = useState<Landmarks[]>([]);
  const [anchor, setAnchor] = useState<FeatureBundle | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [framing, setFraming] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const [outlineFallback, setOutlineFallback] = useState(false);
  const [coached, setCoached] = useState<LockResult['coached']>('full');
  const [bestShape, setBestShape] = useState<Silhouette | null>(null);
  const [liveContour, setLiveContour] = useState<Point[] | null>(null);
  const mode = params.get('pose') === 'stand' ? 'stand' : 'sit';
  const reduced = usePrefersReducedMotion();
  const voiced = useRef({ start: false, done: false });
  useEffect(() => {
    if (step === 'setup' && !voiced.current.start) {
      voiced.current.start = true;
      speakCaption("Let's set your Zen", false, 1);
    }
    if (step === 'glow' && !voiced.current.done) {
      voiced.current.done = true;
      speakCaption(ZEN_SET_VOICE, false, 1);
    }
  }, [step]);
  const { landmarks, wallMs } = useLandmarks(camera.videoElement, live);
  const landmarksRef = useRef<Landmarks | null>(null);
  const maskSamples = useRef<MaskGrid[]>([]);
  const slouchContours = useRef<Point[][]>([]);
  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);

  useEffect(() => {
    if ((step !== 'lock' && step !== 'catch') || !live || !camera.videoElement) return;
    const video = camera.videoElement;
    const id = window.setInterval(() => {
      const frame = landmarksRef.current;
      if (step === 'lock' && frame) {
        const probes = [frame.nose, frame.leftShoulder, frame.rightShoulder].filter((point): point is Point => point !== undefined);
        void import('../../lib/vision/segment').then(({ readPersonMask }) => readPersonMask(video, frame.timestampMs, probes)).then((mask) => {
          if (!mask) return;
          maskSamples.current = [...maskSamples.current, mask].slice(-12);
        });
      }
      void sampleContour(video, frame).then((sample) => {
        if (!sample) return;
        if (step === 'catch') {
          slouchContours.current = [...slouchContours.current, sample.normalized].slice(-25);
          setLiveContour(sample.pixels);
        }
      });
    }, 150);
    return () => window.clearInterval(id);
  }, [step, live, camera.videoElement]);

  useEffect(() => {
    if (step !== 'setup' || !live) return;
    const id = window.setInterval(() => setLight(readLight(camera.videoElement, landmarksRef.current)), 500);
    return () => window.clearInterval(id);
  }, [step, live, camera.videoElement]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      const next = measureLighting(camera.videoElement);
      if (next) setLighting(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [live, camera.videoElement]);

  const goSetup = useCallback(() => setStep('setup'), []);
  const goReset = useCallback(() => {
    if (landmarksRef.current) setFraming(setupCheck(landmarksRef.current, light).score / 100);
    setStep('reset');
  }, [light]);
  const goLock = useCallback(() => {
    maskSamples.current = [];
    setOutlineFallback(false);
    setStep('lock');
  }, []);
  const redo = useCallback(() => {
    voiced.current.done = false;
    voiced.current.start = false;
    setStep('setup');
  }, []);

  const onLocked = useCallback((result: LockResult) => {
    if (!result.forced && !lockMaySave(result.good)) return;
    if (result.frames.length === 0) {
      setStep('catch');
      return;
    }
    setZen(result.frames);
    setCoached(result.coached);
    const bundled = aggregateFrames(result.frames.map((frame) => ({ landmarks: frame })));
    setAnchor({ values: bundled.values, spread: bundled.spread });
    const score = confidenceFromLock({
      good: result.good,
      seen: Math.max(result.seen, result.good),
      stillness: frameStillness(result.frames),
      meanVisibility: frameVisibility(result.frames),
      lighting: lightingPart(light?.face),
      framing,
    });
    setConfidence(score);
    const baseline = computeBaseline(result.frames);
    if (baseline.ok) void save({ ...baseline.baseline, pose: 'sit' });
    const traced = outlineFromMasks(maskSamples.current, landmarksRef.current ?? result.frames[result.frames.length - 1] ?? null);
    setOutlineFallback(traced.fallback);
    const shape = traced.silhouette;
    setBestShape(shape);
    void saveSittingPrint({
      deskProfileId: activeProfileId,
      zen: result.frames,
      slouch: [],
      confidence: score,
      catchMeDetected: false,
      coached: result.coached,
      silhouette: shape ?? undefined,
    });
    setStep('catch');
  }, [activeProfileId, framing, light, save]);

  const onCaught = useCallback((frames: Landmarks[], detected: boolean) => {
    setGaveUp(!detected);
    const anchors = landmarksRef.current ? anchorsFromLandmarks(landmarksRef.current) : null;
    const shape = anchors ? silhouetteFromContours(slouchContours.current, anchors, detected ? 1 : 0, bestShape?.accuracy ?? 80) : null;
    void saveSittingPrint({
      deskProfileId: activeProfileId,
      zen,
      slouch: frames,
      confidence,
      catchMeDetected: detected,
      coached,
      silhouette: bestShape ?? undefined,
      slouchSilhouette: shape ?? undefined,
    });
    setStep('glow');
  }, [activeProfileId, bestShape, coached, confidence, zen]);

  return (
    <ImmersiveStage step={step} landmarks={live ? landmarks : null} lighting={lighting.text} reduced={reduced} onClose={() => navigate(backTo)}>
      <CameraPausedBar live={live} video={camera.videoElement} lastLandmarkMs={wallMs} />
      {step === 'privacy' ? (
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white text-ink shadow-lg">
            <PrivacyCard status={camera.status} errorName={camera.errorName} onStart={() => void camera.start().then((ok) => { if (ok) goSetup(); })} onLeave={() => navigate(backTo)} />
            <p className="px-4 pb-6 text-center text-xs text-ink-muted">DeskZen is a wellness tool, not a medical device.</p>
          </div>
        </div>
      ) : null}
      {step === 'setup' ? <SetupStep landmarks={live ? landmarks : null} light={light} lighting={lighting} onContinue={goReset} onBack={() => navigate(backTo)} /> : null}
      {step === 'reset' ? <ResetStep landmarks={live ? landmarks : null} onDone={goLock} onLeave={goSetup} /> : null}
      {step === 'lock' ? <LockStep landmarks={live ? landmarks : null} reducedMotion={reduced} onLocked={onLocked} onBack={goReset} /> : null}
      {step === 'catch' ? (
        <CatchStep
          landmarks={live ? landmarks : null}
          anchor={anchor}
          best={bestShape}
          bestFrame={zen[zen.length - 1] ?? null}
          liveContour={liveContour}
          onCaught={onCaught}
          onBack={goLock}
        />
      ) : null}
      {step === 'glow' ? (
        <GlowUpStep zen={zen} confidence={confidence} gaveUp={gaveUp} outlineFallback={outlineFallback} silhouette={bestShape} mode={mode} onStart={() => navigate('/live')} onRetry={redo} />
      ) : null}
    </ImmersiveStage>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);
  return reduced;
}

