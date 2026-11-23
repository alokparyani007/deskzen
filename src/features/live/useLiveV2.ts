import { useEffect, useRef, useState } from 'react';
import type { Landmarks, NormPoint } from '../../lib/posture/types';
import type { PosturePrint } from '../../calibration/print';
import { useLandmarks } from '../../hooks/useLandmarks';
import { bounceCount } from '../live/coach';
import { measureLighting } from '../print/lighting';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';
import { formatZenDebug } from '../zen2/debugLine';
import { fitScore, smoothFit, type FitParts } from '../zen2/fitScore';
import { coachCaption, highestPoint, liveCaption, raisedShoulder, stepIntoViewHelper, stepTrackClock, trackKind, type TrackClock } from '../zen2/liveCaption';
import { liveDisplayMode, liveRequestMode, rememberedZenMode, rememberZenMode } from '../zen2/liveMode';
import { beginGuide, initialLiveCoach, poseIsVisible, stepLiveCoach, type CoachPhase } from '../zen2/liveCoach2';
import type { OutlineMarks } from '../zen2/OutlineSvg';
import { liveRules, measurePose, worstLiveRule, type PoseMeasures, type RuleResult } from '../zen2/poseRules';
import { usePersonOutline } from '../zen2/usePersonOutline';
import { loadZenPrint } from '../zen2/zenPrint';
import { zenConfig, type PoseMode } from '../zen2/zenConfig';
import { anchoredTarget, AnchorSmoother, measureAnchor } from './anchor';

export interface LiveModel {
  ready: boolean;
  mode: PoseMode;
  print: PosturePrint | null;
  outline: NormPoint[] | null;
  liveOutline: NormPoint[] | null;
  fit: number | null;
  phase: CoachPhase;
  stepIntoView: boolean;
  framing: string | null;
  title: string;
  helper: string;
  caption: string;
  captionLoud: boolean;
  statusLabel: string | null;
  drifting: boolean;
  shoulders: OutlineMarks | null;
  arrow: { from: NormPoint; to: NormPoint } | null;
  guiding: boolean;
  canGuide: boolean;
  guide: () => void;
  returns: number;
  debug: string | null;
  setMode: (mode: PoseMode) => void;
}

export function useLiveV2(debugOn: boolean): LiveModel & {
  landmarks: Landmarks | null;
  wallMs: number | null;
  live: boolean;
  spoken: { text: string; at: number } | null;
} {
  const camera = useCamera();
  const live = camera.status === 'live';
  const { landmarks, wallMs } = useLandmarks(camera.videoElement, live);
  const { activeProfileId } = useBaseline();
  const session = useSession();
  const sessionMode: PoseMode = session.posture === 'standing' ? 'stand' : 'sit';
  const requested = liveRequestMode({
    workStyle: session.settings.workStyle,
    sessionMode,
    remembered: rememberedZenMode(),
  });
  const [print, setPrint] = useState<PosturePrint | null>(null);
  const mode = liveDisplayMode(print, requested);
  const [ready, setReady] = useState(false);
  const [fit, setFit] = useState<number | null>(null);
  const [parts, setParts] = useState<FitParts | null>(null);
  const [phase, setPhase] = useState<CoachPhase>('ontrack');
  const [stepIntoView, setStepIntoView] = useState(false);
  const [framing, setFraming] = useState<string | null>(null);
  const [title, setTitle] = useState("Nice, you're in your Zen");
  const [helper, setHelper] = useState("Nice. I'll nudge you if you drift.");
  const [caption, setCaption] = useState("Nice, you're in your Zen");
  const [captionLoud, setCaptionLoud] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [driftingView, setDriftingView] = useState(false);
  const [shoulders, setShoulders] = useState<OutlineMarks | null>(null);
  const clock = useRef<TrackClock | null>(null);
  const [spoken, setSpoken] = useState<{ text: string; at: number } | null>(null);
  const [guiding, setGuiding] = useState(false);
  const [returns, setReturns] = useState(0);
  const [dark, setDark] = useState(false);
  const coach = useRef(initialLiveCoach());
  const ema = useRef<number | null>(null);
  const anchor = useRef(new AnchorSmoother());
  const [target, setTarget] = useState<ReturnType<typeof anchoredTarget> | null>(null);
  const spokenRef = useRef<{ text: string; at: number } | null>(null);
  const zen = print?.zen;
  const body = usePersonOutline(camera.videoElement, landmarks, live && Boolean(zen), zenConfig.live.segHz, mode);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void loadZenPrint(requested, activeProfileId, !session.postureManual).then((found) => {
      if (cancelled) return;
      setPrint(found);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [activeProfileId, requested, session.postureManual]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const light = measureLighting(camera.videoElement);
      setDark(Boolean(light && !light.great && light.text.toLowerCase().includes('dark')));
    }, 2000);
    return () => window.clearInterval(id);
  }, [camera.videoElement]);

  useEffect(() => {
    const now = performance.now();
    const visible = landmarks ? poseIsVisible({
      nose: landmarks.nose?.visibility,
      leftEye: landmarks.leftEye?.visibility,
      rightEye: landmarks.rightEye?.visibility,
      leftShoulder: landmarks.leftShoulder?.visibility,
      rightShoulder: landmarks.rightShoulder?.visibility,
    }) : false;
    const measures = landmarks ? measurePose(landmarks) : null;
    // The saved target placed on his body: translation + uniform scale from the smoothed shoulder line.
    const placed = zen && landmarks
      ? anchoredTarget(zen, anchor.current.step(measureAnchor(zen, landmarks, anchor.current.current?.y ?? null), landmarks.timestampMs || now), landmarks)
      : zen ? anchoredTarget(zen, anchor.current.current, { videoWidth: zen.video.width, videoHeight: zen.video.height }) : null;
    let shown = ema.current;
    let nextParts: FitParts | null = null;
    let worst: RuleResult | null = null;
    if (zen && measures) {
      const rules = liveRules(measures, zen.baseline, mode);
      worst = worstLiveRule(rules);
      const computable = rules.filter((rule) => rule.pass !== null);
      // Compare his CURRENT pose to the target where it is drawn: same anchored outline and points.
      const savedPoints = placed?.points ?? zen.points;
      const score = fitScore(
        {
          outline: placed?.outline ?? zen.outline,
          landmarks: {
            nose: savedPoints.nose,
            eyeMid: { x: (savedPoints.leftEye.x + savedPoints.rightEye.x) / 2, y: (savedPoints.leftEye.y + savedPoints.rightEye.y) / 2 },
            leftShoulder: savedPoints.leftShoulder,
            rightShoulder: savedPoints.rightShoulder,
            shoulderWidth: zen.baseline.shoulderWidth,
          },
        },
        {
          outline: body.points,
          landmarks: marks(measures),
          rulesPassed: computable.filter((rule) => rule.pass).length,
          rulesTotal: computable.length,
        },
      );
      shown = smoothFit(ema.current, score.percent);
      ema.current = shown;
      nextParts = score.parts;
    } else {
      ema.current = null;
      shown = null;
    }
    const liveLeft = measures && measures.leftShoulderX !== null && measures.leftShoulderY !== null ? { x: measures.leftShoulderX, y: measures.leftShoulderY } : null;
    const liveRight = measures && measures.rightShoulderX !== null && measures.rightShoulderY !== null ? { x: measures.rightShoulderX, y: measures.rightShoulderY } : null;
    const shoulder = zen ? raisedShoulder(liveLeft, liveRight, zen.points.leftShoulder, zen.points.rightShoulder) : null;
    const speakLine = liveCaption(worst, mode, shoulder);
    // A raised shoulder is drift even when the outline score is still high, so the tip is spoken after 3 s.
    const coachFit = shoulder && shown !== null ? Math.min(shown, zenConfig.driftBelow - 1) : shown;
    const view = stepLiveCoach(coach.current, {
      nowMs: now,
      fit: coachFit,
      poseVisible: visible,
      faceCount: landmarks?.faceCount ?? 0,
      framing: framingText(measures, landmarks, dark),
      tipId: shoulder && (!worst || worst.id === 'L-tilt') ? 'L-tilt' : worst?.id ?? 'outline',
      tipTitle: speakLine,
    });
    coach.current = view.state;
    const line = coachCaption({
      away: view.stepIntoView,
      drifting: view.phase === 'drifting',
      guiding: view.guiding,
      mode,
      worst,
      shoulder,
    });
    const tracked = stepTrackClock(clock.current, zen ? trackKind(view.phase, shoulder !== null, view.stepIntoView) : null, now);
    clock.current = tracked.clock;
    setTarget(placed);
    setFit(shown === null ? null : Math.round(shown));
    setParts(nextParts);
    setPhase(view.phase);
    setStepIntoView(view.stepIntoView);
    setFraming(view.framingPill);
    setGuiding(view.guiding);
    setReturns(view.state.returns);
    setCaption(zen ? line.text : '');
    setCaptionLoud(line.loud);
    setStatusLabel(tracked.label);
    setDriftingView(tracked.clock?.kind === 'drifting');
    setShoulders(shoulder && !view.stepIntoView && liveLeft && liveRight
      ? { left: liveLeft, right: liveRight, label: 'Shoulders level', tone: 'amber' }
      : null);
    setTitle(line.text);
    setHelper(view.stepIntoView ? stepIntoViewHelper(mode) : line.loud ? speakLine : "I'll nudge you if you drift.");
    if (view.speak) {
      const spokenLine = { text: view.speak, at: now };
      spokenRef.current = spokenLine;
      setSpoken(spokenLine);
    }
  }, [body.points, dark, landmarks, mode, zen]);

  const guide = () => {
    const measures = landmarks ? measurePose(landmarks) : null;
    const worst = zen && measures ? worstLiveRule(liveRules(measures, zen.baseline, mode)) : null;
    const liveLeft = measures && measures.leftShoulderX !== null && measures.leftShoulderY !== null ? { x: measures.leftShoulderX, y: measures.leftShoulderY } : null;
    const liveRight = measures && measures.rightShoulderX !== null && measures.rightShoulderY !== null ? { x: measures.rightShoulderX, y: measures.rightShoulderY } : null;
    const shoulder = zen ? raisedShoulder(liveLeft, liveRight, zen.points.leftShoulder, zen.points.rightShoulder) : null;
    const tip = liveCaption(worst, mode, shoulder);
    const view = beginGuide(coach.current, performance.now(), worst?.id ?? 'guide', tip);
    coach.current = view.state;
    setGuiding(true);
    setTitle(tip);
    setHelper(tip);
    setCaption(tip);
    setCaptionLoud(true);
    if (view.speak) setSpoken({ text: view.speak, at: performance.now() });
  };

  const targetNose = target?.points.nose ?? zen?.points.nose ?? null;
  const headGap = targetNose && landmarks?.nose && landmarks.videoWidth > 0
    ? Math.hypot(landmarks.nose.x / landmarks.videoWidth - targetNose.x, landmarks.nose.y / landmarks.videoHeight - targetNose.y)
    : 0;
  const shoulderTip = caption.startsWith('Relax your');
  const showArrow = Boolean(zen && landmarks?.nose && headGap > zenConfig.arrowGap && (phase === 'drifting' || guiding) && !shoulderTip);
  const liveTop = highestPoint(body.points);
  const savedTop = highestPoint(target?.outline ?? zen?.outline);
  const arrowFrom = liveTop ?? (landmarks?.nose && landmarks.videoWidth > 0 ? { x: landmarks.nose.x / landmarks.videoWidth, y: landmarks.nose.y / landmarks.videoHeight - 0.14 } : null);
  const arrowTo = savedTop ?? targetNose;
  const bounces = bounceCount(session.minutes, Date.now(), session.timeZone) + returns;

  return {
    ready,
    mode,
    print,
    outline: zen ? target?.outline ?? zen.outline : null,
    liveOutline: body.points,
    fit,
    phase,
    stepIntoView,
    framing,
    title,
    helper,
    caption,
    captionLoud,
    statusLabel,
    drifting: driftingView,
    shoulders,
    arrow: showArrow && arrowFrom && arrowTo
      ? {
          from: { x: arrowFrom.x, y: Math.max(0.02, arrowFrom.y - (liveTop ? 0.03 : 0)) },
          to: { x: arrowTo.x, y: Math.max(0.02, arrowTo.y - (savedTop ? 0.03 : 0.12)) },
        }
      : null,
    guiding,
    canGuide: Boolean(zen && landmarks && poseIsVisible({ nose: landmarks.nose?.visibility, leftEye: landmarks.leftEye?.visibility, rightEye: landmarks.rightEye?.visibility, leftShoulder: landmarks.leftShoulder?.visibility, rightShoulder: landmarks.rightShoulder?.visibility })),
    guide,
    returns: bounces,
    debug: debugOn
      ? formatZenDebug({
          frame: landmarks,
          mode,
          print: zen ? 'v3' : print ? 'yes' : 'no',
          fit,
          parts,
          measures: landmarks ? measurePose(landmarks) : null,
          baselineNeck: zen?.baseline.neckRatio ?? null,
          baselineFace: zen?.baseline.faceShoulderRatio ?? null,
          phase,
          segHz: body.hz,
        })
      : null,
    setMode: (next) => {
      rememberZenMode(next);
      session.choosePosture(next === 'stand' ? 'standing' : 'sitting');
    },
    landmarks,
    wallMs,
    live,
    spoken,
  };
}

function marks(measures: PoseMeasures) {
  return {
    nose: measures.noseX !== null && measures.noseY !== null ? { x: measures.noseX, y: measures.noseY } : null,
    eyeMid: measures.eyeMidX !== null && measures.eyeMidY !== null ? { x: measures.eyeMidX, y: measures.eyeMidY } : null,
    leftShoulder: measures.leftShoulderX !== null && measures.leftShoulderY !== null ? { x: measures.leftShoulderX, y: measures.leftShoulderY } : null,
    rightShoulder: measures.rightShoulderX !== null && measures.rightShoulderY !== null ? { x: measures.rightShoulderX, y: measures.rightShoulderY } : null,
    shoulderWidth: measures.shoulderWidth,
  };
}

function framingText(measures: PoseMeasures | null, frame: Landmarks | null, dark: boolean): string | null {
  if (!measures?.present || !frame) return null;
  if (frame.faceCount >= 2 && frame.faceAmbiguous) return 'Just you in the frame, please';
  if (!measures.shouldersVisible) return 'Show both shoulders';
  if (dark) return 'Add some light';
  if (measures.eyeMidX !== null && measures.eyeMidX < zenConfig.headCenter.min) return 'Move a little left';
  if (measures.eyeMidX !== null && measures.eyeMidX > zenConfig.headCenter.max) return 'Move a little right';
  return null;
}
