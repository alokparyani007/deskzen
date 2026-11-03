import { useEffect, useRef, useState } from 'react';
import { fitLockedPose, liveFromPrint, type LockedPose } from '../../calibration/lockedPose';
import { findLivePrint, type PosturePrint } from '../../calibration/print';
import { loadPrintLibrary } from '../../calibration/store';
import type { Landmarks } from '../../lib/posture/types';
import type { Silhouette } from '../../lib/posture/silhouette';
import { playChime } from '../../lib/chime';
import { playLockIn, speakCaption, stopSpeech } from '../calibrate/glowVoice';
import { useCamera, type CameraStatus } from '../camera/camera-context';
import { measureLighting } from '../print/lighting';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';
import {
  bounceCount,
  emptyBand,
  emptyCoach,
  emptyVoice,
  gateCoachVoice,
  LIVE_HELLO,
  nextVoice,
  outlineKind,
  readDrifts,
  smoothScore,
  stepBand,
  stepCoach,
  wholePercent,
  type BandMemory,
  type CoachChip,
  type CoachDrift,
  type MatchBand,
  type OutlineKind,
  type VoiceState,
} from './coach';
import { printDrift } from './drift';
import { emptyFrame, frameStatus, framingCopy, PRESENCE_VISIBILITY, shoulderWidthRatio, sideNudge, stepFrame, type FrameMemory, type FrameStatus } from './frame';
import {
  emptyGuide,
  GUIDE_DONE,
  GUIDE_DONE_HELP,
  guideLine,
  guideReady,
  moveCue,
  shouldAutoGuide,
  startGuide,
  stepGuide,
  type GuideMemory,
  type MoveCue,
} from './guide';
import type { OverlayModel } from './LiveOverlay';
import { openScoreWidget } from './miniWidget';

export interface LiveWire {
  print: PosturePrint | null;
  printReady: boolean;
  poseMode: 'sit' | 'stand';
  pose: LockedPose | null;
  silhouette: Silhouette | null;
  art: OutlineKind;
  live: boolean;
  cameraStatus: CameraStatus;
  errorName: string | null;
  start: () => Promise<boolean>;
  pause: () => void;
  hd: boolean;
  landmarks: Landmarks | null;
  coachFrame: Landmarks | null;
  visionStatus: 'idle' | 'loading' | 'ready' | 'error';
  visionError: string | null;
  shown: FrameStatus;
  estimated: boolean;
  percent: number | null;
  band: MatchBand;
  drift: CoachDrift | null;
  bar: CoachChip | null;
  cue: MoveCue | null;
  guideMemory: GuideMemory;
  hold: number;
  showSteps: boolean;
  framing: string | null;
  sound: boolean;
  toggleSound: () => void;
  posture: 'sitting' | 'standing';
  postureManual: boolean;
  choosePosture: (mode: 'sitting' | 'standing') => void;
  followPosture: () => void;
  bounces: number;
  canPop: boolean;
  widgetNote: string | null;
  popOut: () => void;
  canGuide: boolean;
  guiding: boolean;
  onGuide: () => void;
  stopGuide: () => void;
  person: boolean;
  shoulderWait: boolean;
  debug: string | null;
  reduced: boolean;
  drifting: boolean;
  toast: boolean;
  modelRef: { current: OverlayModel | null };
}

export function useLiveWire(): LiveWire {
  const { landmarks, visionStatus, visionError, settings, posture, captureGoodPosture, updateSettings, choosePosture, followPosture, postureManual, minutes, timeZone } = useSession();
  const { status, errorName, start, pause, videoElement, resolution, hd } = useCamera();
  const { activeProfileId } = useBaseline();
  const [print, setPrint] = useState<PosturePrint | null>(null);
  const [printReady, setPrintReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [dark, setDark] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [guideMemory, setGuideMemory] = useState<GuideMemory>(emptyGuide());
  const [guideBounces, setGuideBounces] = useState(0);
  const [widgetNote, setWidgetNote] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [debugOn] = useState(() => new URLSearchParams(window.location.search).get('debug') === '1');
  const live = status === 'live';
  const poseMode = posture === 'standing' ? 'stand' : 'sit';
  const goodStarted = useRef(false);
  const coachRef = useRef(emptyCoach());
  const voiceRef = useRef(emptyVoice());
  const voiceToken = useRef(0);
  const bandRef = useRef<BandMemory | null>(null);
  const smoothRef = useRef<number | null>(null);
  const frameRef = useRef<FrameMemory>(emptyFrame());
  const zenSince = useRef<number | null>(null);
  const zenChimed = useRef(false);
  const coachLandmarksRef = useRef<Landmarks | null>(null);
  const guideRef = useRef(emptyGuide());
  const autoUsed = useRef(false);
  const offSince = useRef<number | null>(null);
  const helloSaid = useRef(false);
  const voiceBoot = useRef(false);
  const frameWatch = useRef<{ since: number | null; said: boolean }>({ since: null, said: false });
  const voiceTone = useRef<CoachChip['tone'] | null>(null);
  const modelRef = useRef<OverlayModel | null>(null);
  const labelRef = useRef('DeskZen');
  const shownRef = useRef<FrameStatus>('no-person');
  const percentRef = useRef<number | null>(null);
  const amountsRef = useRef<ReturnType<typeof readDrifts>['amounts'] | null>(null);
  const chipRef = useRef<CoachChip | null>(null);
  const soundRef = useRef(settings.sound);
  const printRef = useRef<PosturePrint | null>(null);
  const postureRef = useRef(posture);
  const autoRef = useRef(settings.autoGuideBack);
  const fpsRef = useRef<number[]>([]);
  const voiceApi = useRef<{
    sayHello: () => void;
    sayGuide: (text: string) => void;
    sayFrame: () => void;
    utter: (result: { state: VoiceState; speak: string | null }) => void;
  }>({
    sayHello: () => undefined,
    sayGuide: () => undefined,
    sayFrame: () => undefined,
    utter: () => undefined,
  });

  useEffect(() => {
    let cancel = false;
    setPrint(null);
    setPrintReady(false);
    guideRef.current = emptyGuide();
    setGuideMemory(emptyGuide());
    offSince.current = null;
    void loadPrintLibrary().then((library) => {
      if (cancel) return;
      setPrint(findLivePrint(library, poseMode, activeProfileId, !postureManual) ?? null);
      setPrintReady(true);
    });
    return () => {
      cancel = true;
    };
  }, [activeProfileId, poseMode, postureManual]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!live) {
      setDark(false);
      return;
    }
    const sample = () => {
      const light = measureLighting(videoElement);
      if (!light) return;
      setDark(!light.great && light.text.startsWith('A bit dark'));
    };
    sample();
    const id = window.setInterval(sample, 1000);
    return () => window.clearInterval(id);
  }, [live, videoElement]);

  useEffect(() => {
    if (!debugOn || !landmarks) return;
    const stamps = fpsRef.current;
    const time = performance.now();
    stamps.push(time);
    while (stamps.length > 0 && time - (stamps[0] ?? time) > 1000) stamps.shift();
    setFps((prev) => (prev === stamps.length ? prev : stamps.length));
  }, [debugOn, landmarks]);

  if (!live) {
    frameRef.current = emptyFrame();
    coachLandmarksRef.current = null;
  }
  const videoReady = Boolean(videoElement && videoElement.readyState >= 1 && videoElement.videoWidth > 0);
  const read = frameStatus(landmarks, {
    dark: live && dark,
    shoulderRatio: shoulderWidthRatio(print?.lockedPose),
    videoReady: !live || videoReady,
  });
  const stepped = live ? stepFrame(frameRef.current, now, read.status, 2_000) : { memory: frameRef.current, shown: 'no-person' as const };
  if (live) frameRef.current = stepped.memory;
  let shown = stepped.shown;
  if (live && read.status !== 'no-person' && read.status !== 'ok') shown = read.status;
  const bothShoulders = shown === 'ok' && !read.estimated && Boolean(read.coaching);
  if (bothShoulders && read.coaching) coachLandmarksRef.current = read.coaching;
  if (!bothShoulders) coachLandmarksRef.current = null;
  const coachFrame = bothShoulders ? coachLandmarksRef.current : null;
  const estimated = read.estimated;
  const faceWidth = coachFrame?.faceBox?.w ?? 0;
  const fitted = print?.lockedPose && faceWidth > 0 ? fitLockedPose(print.lockedPose, faceWidth) : null;
  const scoredPose = fitted?.pose ?? print?.lockedPose;
  const scored = live && print && coachFrame ? readDrifts(coachFrame, { ...print, lockedPose: scoredPose }) : null;
  const drift = scored ? scored.drift : null;
  const coached = scored ? stepCoach(coachRef.current, now, drift) : null;
  if (coached) coachRef.current = coached.memory;
  const rawScore = print && coachFrame ? liveFromPrint(printDrift(coachFrame, print, scoredPose).amount).score : null;
  smoothRef.current = rawScore === null ? null : smoothScore(smoothRef.current, rawScore);
  const percent = smoothRef.current === null ? null : wholePercent(smoothRef.current);
  let band: MatchBand = 'good';
  if (percent !== null) {
    const memory = bandRef.current ?? emptyBand(percent);
    const nextBand = stepBand(memory, now, percent);
    bandRef.current = nextBand.memory;
    band = nextBand.band;
  } else {
    bandRef.current = null;
  }

  let bar: CoachChip | null = null;
  let cue: MoveCue | null = null;
  let framing: string | null = null;
  const shoulderWait = Boolean(live && print && read.person && !bothShoulders && shown !== 'multiple' && shown !== 'dark');
  if (live && print && guideMemory.phase === 'step') {
    const line = guideLine(guideMemory.step, posture === 'standing');
    bar = { title: line.title, helper: line.helper, tone: 'drift', drift: null };
    cue = moveCue({ guideStep: guideMemory.step, drift, percent });
  } else if (live && print && guideMemory.phase === 'done') {
    bar = { title: GUIDE_DONE, helper: GUIDE_DONE_HELP, tone: 'zen', drift: null };
  } else if (live && print && !read.person && shown === 'no-person') {
    framing = 'Step into view';
  } else if (live && print && (shown === 'multiple' || shown === 'dark')) {
    framing = framingCopy(shown, landmarks)?.title ?? null;
  } else if (shoulderWait) {
    framing = sideNudge(landmarks) ?? 'Show both shoulders';
  } else if (live && print && sideNudge(coachFrame)) {
    framing = sideNudge(coachFrame);
  } else if (coached && coached.chip.drift !== 'out-of-frame') {
    bar = coached.chip;
    cue = moveCue({ guideStep: null, drift: coached.chip.drift, percent });
  }

  const art = outlineKind({ hasPrint: Boolean(print), silhouette: print?.silhouette, hasLockedPose: Boolean(print?.lockedPose) });
  const drifting = percent !== null && percent < 80 && bothShoulders && !framing;
  if (percent !== null && percent >= 90 && shown === 'ok') {
    if (zenSince.current === null) zenSince.current = now;
  } else {
    zenSince.current = null;
    zenChimed.current = false;
  }
  const toast = zenSince.current !== null && now - zenSince.current >= 2_000;
  modelRef.current = {
    kind: art,
    landmarks: coachFrame ?? (framing ? read.coaching ?? landmarks : null),
    silhouette: print?.silhouette ?? null,
    pose: print?.lockedPose ?? null,
    percent,
    pulse: toast && !reduced,
    celebrate: toast,
    reduced,
    drifting,
    ghost: Boolean(framing),
  };
  labelRef.current = percent !== null ? `${percent}% match` : 'DeskZen';
  shownRef.current = shown;
  percentRef.current = percent;
  amountsRef.current = scored?.amounts ?? null;
  chipRef.current = coached?.chip ?? null;
  soundRef.current = settings.sound;
  printRef.current = print;
  postureRef.current = posture;
  autoRef.current = settings.autoGuideBack;

  voiceApi.current.utter = (result) => {
    voiceRef.current = result.state;
    if (!result.speak) return;
    const token = voiceToken.current + 1;
    voiceToken.current = token;
    speakCaption(result.speak, false, 1, () => {
      if (voiceToken.current !== token) return;
      voiceRef.current = { ...voiceRef.current, busy: false };
    });
  };
  voiceApi.current.sayHello = () => {
    voiceApi.current.utter(nextVoice(voiceRef.current, Date.now(), { text: LIVE_HELLO, kind: 'tip' }));
  };
  voiceApi.current.sayGuide = (text) => {
    const opened: VoiceState = { ...voiceRef.current, spokenAt: Number.NEGATIVE_INFINITY, busy: false, tip: null };
    voiceApi.current.utter(nextVoice(opened, Date.now(), { text, kind: 'tip' }));
  };
  voiceApi.current.sayFrame = () => {
    const opened: VoiceState = { ...voiceRef.current, spokenAt: Number.NEGATIVE_INFINITY, busy: false, tip: null };
    voiceApi.current.utter(nextVoice(opened, Date.now(), { text: 'Step back into view', kind: 'tip' }));
  };

  useEffect(() => {
    if (voiceBoot.current) return;
    voiceBoot.current = true;
    const choice = window.localStorage.getItem('sitglow.voice');
    if (choice === '0' || choice === '1') {
      const on = choice === '1';
      if (settings.sound !== on) updateSettings({ sound: on });
      return;
    }
    window.localStorage.setItem('sitglow.voice', '1');
    if (!settings.sound) updateSettings({ sound: true });
  }, [settings.sound, updateSettings]);

  useEffect(() => {
    if (!live) {
      helloSaid.current = false;
      guideRef.current = emptyGuide();
      setGuideMemory(emptyGuide());
      offSince.current = null;
      frameWatch.current = { since: null, said: false };
      stopSpeech();
      voiceRef.current = { ...voiceRef.current, busy: false };
      return;
    }
    if (!print || !settings.sound || helloSaid.current) return;
    helloSaid.current = true;
    voiceApi.current.sayHello();
  }, [live, print, settings.sound]);

  useEffect(() => {
    if (settings.sound) return;
    stopSpeech();
    voiceRef.current = { ...voiceRef.current, busy: false };
  }, [settings.sound]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (!soundRef.current || !printRef.current) return;
      if (shownRef.current !== 'ok') {
        const watch = frameWatch.current;
        const time = Date.now();
        if (watch.since === null) watch.since = time;
        if (!watch.said && time - watch.since >= 5_000) {
          watch.said = true;
          voiceApi.current.sayFrame();
        }
        return;
      }
      frameWatch.current = { since: null, said: false };
      const phase = guideRef.current.phase;
      if (phase === 'step' || phase === 'done') return;
      const chipNow = chipRef.current;
      if (!chipNow) return;
      const time = Date.now();
      if (chipNow.tone === 'drift') {
        voiceTone.current = 'drift';
        voiceApi.current.utter(gateCoachVoice(voiceRef.current, time, {
          guiding: false,
          text: chipNow.title,
          kind: 'tip',
          driftMs: time - coachRef.current.tipSince,
        }));
        return;
      }
      if (voiceTone.current === 'drift') {
        voiceTone.current = 'zen';
        voiceApi.current.utter(gateCoachVoice(voiceRef.current, time, {
          guiding: false,
          text: chipNow.title,
          kind: 'nice',
          driftMs: 3_000,
        }));
      }
    }, 400);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const commit = (next: GuideMemory) => {
      guideRef.current = next;
      setGuideMemory((prev) => (prev.phase === next.phase && prev.step === next.step && prev.holdMs === next.holdMs && prev.spoken === next.spoken ? prev : next));
    };
    const id = window.setInterval(() => {
      if (!printRef.current || shownRef.current !== 'ok') return;
      const tick = Date.now();
      const standing = postureRef.current === 'standing';
      const amounts = amountsRef.current;
      const ready = amounts ? guideReady(amounts) : { sit: false, shoulders: false, chin: false };
      const memory = guideRef.current;
      if (memory.phase === 'done') {
        if (tick - memory.lastAt >= 4_000) commit(emptyGuide());
        return;
      }
      if (memory.phase === 'step') {
        if (!amounts) return;
        const steppedGuide = stepGuide(memory, tick, ready, standing);
        commit(steppedGuide.memory);
        if (steppedGuide.bounce) setGuideBounces((count) => count + 1);
        if (steppedGuide.speak && soundRef.current) voiceApi.current.sayGuide(steppedGuide.speak);
        if (steppedGuide.chime && soundRef.current) playLockIn();
        return;
      }
      const match = percentRef.current;
      if (match !== null && match < 70) {
        if (offSince.current === null) offSince.current = tick;
      } else offSince.current = null;
      if (!amounts || !shouldAutoGuide({ enabled: autoRef.current, used: autoUsed.current, guiding: false, offSince: offSince.current, now: tick, match })) return;
      autoUsed.current = true;
      const started = startGuide(tick, ready, standing);
      commit(started.memory);
      if (started.speak && soundRef.current) voiceApi.current.sayGuide(started.speak);
      if (started.chime && soundRef.current) playLockIn();
    }, 250);
    return () => window.clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!toast || zenChimed.current || !settings.sound) return;
    zenChimed.current = true;
    playChime();
  }, [toast, settings.sound]);

  useEffect(() => {
    if (!live || goodStarted.current) return;
    if (new URLSearchParams(window.location.search).get('good') !== '1') return;
    goodStarted.current = true;
    captureGoodPosture();
  }, [live, captureGoodPosture]);

  const onGuide = () => {
    if (!live || !print || !read.person || guideRef.current.phase === 'step') return;
    const amounts = amountsRef.current;
    const ready = amounts ? guideReady(amounts) : { sit: false, shoulders: false, chin: false };
    const started = startGuide(Date.now(), ready, posture === 'standing');
    autoUsed.current = true;
    guideRef.current = started.memory;
    setGuideMemory(started.memory);
    if (started.bounce) setGuideBounces((count) => count + 1);
    if (started.speak && settings.sound) voiceApi.current.sayGuide(started.speak);
    if (started.chime && settings.sound) playLockIn();
  };

  const stopGuide = () => {
    guideRef.current = emptyGuide();
    setGuideMemory(emptyGuide());
  };

  const popOut = () => {
    if (!videoElement) return;
    void openScoreWidget(videoElement, () => labelRef.current, () => postureRef.current).then((result) => {
      setWidgetNote(result === 'open' ? null : 'Mini mirror needs Chrome or Edge.');
    });
  };

  const noseVis = landmarks?.nose?.visibility;
  const debug = debugOn
    ? `landmarks ${landmarkCount(landmarks)} · faces ${landmarks?.faceCount ?? 0} · nose ${noseVis === undefined ? '–' : noseVis.toFixed(2)} · vis≥${PRESENCE_VISIBILITY} · ${landmarks?.videoWidth || resolution?.width || videoElement?.videoWidth || 0}×${landmarks?.videoHeight || resolution?.height || videoElement?.videoHeight || 0} · ${poseMode} · print ${print ? 'yes' : 'no'} · ${shown} · ${fps} fps`
    : null;

  return {
    print,
    printReady,
    poseMode,
    pose: print?.lockedPose ?? null,
    silhouette: print?.silhouette ?? null,
    art,
    live,
    cameraStatus: status,
    errorName,
    start,
    pause,
    hd,
    landmarks,
    coachFrame,
    visionStatus,
    visionError,
    shown,
    estimated,
    percent,
    band,
    drift,
    bar,
    cue,
    guideMemory,
    hold: guideMemory.phase === 'step' ? guideMemory.holdMs / 1_500 : 0,
    showSteps: guideMemory.phase !== 'idle',
    framing,
    sound: settings.sound,
    toggleSound: () => {
      const next = !settings.sound;
      window.localStorage.setItem('sitglow.voice', next ? '1' : '0');
      updateSettings({ sound: next });
    },
    posture,
    postureManual,
    choosePosture,
    followPosture,
    bounces: bounceCount(minutes, now, timeZone) + guideBounces,
    canPop: live && Boolean(videoElement),
    widgetNote,
    popOut,
    canGuide: Boolean(print) && read.person && guideMemory.phase !== 'step',
    guiding: guideMemory.phase === 'step',
    onGuide,
    stopGuide,
    person: read.person,
    shoulderWait,
    debug,
    reduced,
    drifting,
    toast,
    modelRef,
  };
}

function landmarkCount(frame: Landmarks | null): number {
  if (!frame) return 0;
  const points = [frame.nose, frame.leftEye, frame.rightEye, frame.leftEar, frame.rightEar, frame.leftShoulder, frame.rightShoulder, frame.leftElbow, frame.rightElbow, frame.leftHip, frame.rightHip];
  return points.filter((point) => point !== undefined).length;
}
