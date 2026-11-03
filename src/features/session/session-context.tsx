import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isZenPath } from '../../app/zenPath';
import { playChime } from '../../lib/chime';
import { downloadJson } from '../../lib/download';
import { noteFixedIt, noteSnooze, resetAdaptive, type AdaptiveState } from '../../lib/posture/adaptive';
import { postureConfig } from '../../lib/posture/config';
import { inchesFromBest } from '../../lib/posture/readSignals';
import { fixedIt as applyFixedIt, snoozeNudge } from '../../lib/posture/nudges';
import { nudgeCopy } from '../../lib/posture/score';
import type { SignalKey } from '../../lib/posture/types';
import { bumpCount, localDayKey, upsertMinute, type CountField, type DayCounts, type MinuteRecord } from '../../lib/progress/aggregate';
import { seedMinutes } from '../../lib/progress/seed';
import { initialEngine, stepEngine, stepPresence, type EngineState, type FocusSession } from '../../lib/session/engine';
import {
  isQuietHour,
  loadAdaptive,
  loadSettings,
  mergeSettings,
  resetSettings,
  saveAdaptive,
  saveSettings,
  thresholdFromStrictness,
  type AppSettings,
} from '../../lib/settings';
import { resolvedPosture } from '../../lib/settings/visibility';
import { getHolds, isHeld } from '../../lib/reminders/holds';
import { initialMode, setManualMode, stepPostureMode, undoPosture, type ModeState, type StandSignals } from '../../lib/posture/standing';
import { todayKey } from '../../lib/posture/glowStore';
import { loadBaseline, loadStandingBaseline } from '../../lib/storage/local-data';
import { loadDayCounts, loadMinutes, loadNeckChecks, replaceMinutes, saveDayCounts, saveMinute } from '../../lib/storage/history';
import { useLandmarks, type VisionStatus } from '../../hooks/useLandmarks';
import { useBaseline } from '../posture/baseline-context';
import { useGlowLearning } from './useGlowLearning';
import { useCamera } from '../camera/camera-context';
import { useSpotCheck } from '../spotcheck/useSpotCheck';
import type { SpotRecord } from '../../lib/spotcheck/history';
import type { Landmarks, PostureScore, SignalReadings } from '../../lib/posture/types';

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const ABSENT_STOP_MS = 5 * 60 * 1000;

interface SessionValue {
  landmarks: Landmarks | null;
  visionStatus: VisionStatus;
  visionError: string | null;
  score: PostureScore | null;
  readings: SignalReadings | null;
  nudgePhase: EngineState['nudge']['phase'];
  nudgeIssue?: SignalKey;
  toast: string | null;
  banner: boolean;
  presenceMs: number;
  distanceAlertIn: number | null;
  focus: FocusSession | null;
  settings: AppSettings;
  threshold: number;
  minutes: MinuteRecord[];
  dayCounts: DayCounts[];
  cameraLive: boolean;
  timeZone: string;
  dismissToast: () => void;
  dismissDistance: () => void;
  fixedIt: () => void;
  snooze: () => void;
  laterBreak: () => void;
  startBreak: () => void;
  finishBreak: () => void;
  cancelBreak: () => void;
  logWater: () => void;
  logHabit: (field: CountField) => void;
  startFocus: (minutes: number) => void;
  dismissFocus: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetStrictness: () => void;
  posture: 'sitting' | 'standing';
  /** The pose the toggle last chose, before work-style resolution. */
  chosenPosture: 'sitting' | 'standing';
  postureManual: boolean;
  wallMs: number | null;
  stillMs: number;
  choosePosture: (mode: 'sitting' | 'standing') => void;
  followPosture: () => void;
  standSignals: StandSignals;
  switchToast: 'sitting' | 'standing' | null;
  undoSwitch: () => void;
  dismissSwitch: () => void;
  suggestStand: boolean;
  dismissStandSuggest: () => void;
  seedDemo: () => Promise<void>;
  exportData: () => Promise<void>;
  setupAsk: boolean;
  dismissSetup: () => void;
  spotCountdown: number | null;
  /** When the next spot check is due (epoch ms), or null when spot checks are off. */
  spotNextDueMs: number | null;
  spotHold: 'glow' | 'workday' | 'quiet' | 'paused' | 'focus' | null;
  spotChecking: boolean;
  spotToast: string | null;
  spotFixCopy: string | null;
  spotFixIssue: string | null;
  spotStretchId: string | null;
  spotDenied: boolean;
  spotHistory: SpotRecord[];
  skipSpot: () => void;
  snoozeSpot: () => void;
  allowSpotChecks: () => void;
  dismissSpotStretch: () => void;
  dismissSpotFix: () => void;
  dismissSpotToast: () => void;
  reenableCamera: () => void;
  glowAsk: boolean;
  acceptGlow: () => void;
  dismissGlowOffer: () => void;
  strictAsk: boolean;
  dismissStrict: () => void;
  goodPosture: 'idle' | 'capturing' | 'saved';
  captureGoodPosture: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { status, videoElement, start: startCamera, pause: pauseCamera, lastError } = useCamera();
  const { baseline, standing } = useBaseline();
  const [settings, setSettings] = useState(loadSettings);
  const [postureMode, setPostureMode] = useState<ModeState>(initialMode);
  const [switchToast, setSwitchToast] = useState<'sitting' | 'standing' | null>(null);
  const [today] = useState(() => todayKey());
  const [suggestDay, setSuggestDay] = useState<string | null>(() => window.localStorage.getItem('sitglow.standSuggest'));
  const [adaptive, setAdaptive] = useState<AdaptiveState>(loadAdaptive);
  const [engine, setEngine] = useState(initialEngine);
  const [minutes, setMinutes] = useState<MinuteRecord[]>([]);
  const [dayCounts, setDayCounts] = useState<DayCounts[]>([]);
  const [powerSave, setPowerSave] = useState(false);
  const [spotVision, setSpotVision] = useState(false);
  const cameraLive = status === 'live';
  const continuous = settings.cameraMode === 'always' && settings.tracking;
  const spotLive = spotVision || location.pathname === '/spot-fix';
  const track = cameraLive && (spotLive || (!isZenPath(location.pathname) && continuous && !powerSave));
  const posture = resolvedPosture(settings.workStyle, postureMode.mode);
  const activeBaseline = posture === 'standing' && standing ? standing : baseline;
  const vision = useLandmarks(videoElement, track);
  const scoreRef = useRef(0);
  const engineRef = useRef(engine);

  if (!powerSave && engine.absentMs >= ABSENT_STOP_MS) setPowerSave(true);

  const threshold = settings.strictness === null ? adaptive.threshold : thresholdFromStrictness(settings.strictness);
  // Move breaks can be turned off; an endless timer never shows the banner.
  const breakMs = settings.moveBreaks ? (settings.workStyle === 'stand' ? settings.standBreakMinutes : settings.breakMinutes) * 60_000 : Number.POSITIVE_INFINITY;
  if (vision.landmarks && vision.wallMs !== null && vision.wallMs !== postureMode.atMs) {
    const next = stepPostureMode(postureMode, {
      nowMs: vision.wallMs,
      auto: settings.workStyle === 'mixed' && settings.autoDetect,
      landmarks: vision.landmarks,
      sitting: baseline,
      standing,
      today,
      suggestDay,
    });
    setPostureMode(next);
    if (next.justSwitched) setSwitchToast(next.justSwitched);
  }
  if (continuous && vision.landmarks && vision.wallMs !== null && activeBaseline && vision.wallMs !== engine.wallMs) {
    setEngine(
      stepEngine(engine, vision.landmarks, vision.wallMs, activeBaseline, {
        threshold,
        sustainMs: settings.nudgeDelaySeconds * 1000,
        weightScale: adaptive.weightScale,
        breakMs,
        distanceAlerts: settings.distanceAlerts,
        pose: posture === 'standing' ? 'stand' : 'sit',
        deskTips: settings.deskHeightTips,
      }),
    );
  }

  const spot = useSpotCheck({
    enabled: settings.cameraMode === 'spot' && settings.spotChecks,
    settings,
    landmarks: vision.landmarks,
    wallMs: vision.wallMs,
    confidence: postureMode.signals.confidence,
    baseline,
    standing,
    threshold,
    focusActive: Boolean(engine.focus && !engine.focus.ended),
    fixRoute: location.pathname === '/spot-fix',
    cameraLive,
    setSpotVision,
    start: startCamera,
    pause: pauseCamera,
    lastError,
  });

  const learning = useGlowLearning({
    landmarks: vision.landmarks,
    wallMs: vision.wallMs,
    score: engine.score?.smoothed ?? null,
    good: engine.readings?.quality === 'good',
    pose: posture,
    enabled: track && Boolean(activeBaseline),
  });

  useEffect(() => {
    scoreRef.current = engine.score?.smoothed ?? 0;
    engineRef.current = engine;
  }, [engine]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveAdaptive(adaptive);
  }, [adaptive]);

  useEffect(() => {
    void Promise.all([loadMinutes(), loadDayCounts()]).then(([loadedMinutes, loadedCounts]) => {
      setMinutes(loadedMinutes);
      setDayCounts(loadedCounts);
    });
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      setPowerSave(false);
      setEngine((state) => ({ ...state, absentMs: 0 }));
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (cameraLive) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      setEngine((state) => stepPresence(state, dt, now, breakMs));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cameraLive, breakMs]);

  useEffect(() => {
    const closed = engine.closedMinute;
    if (!closed) return;
    void saveMinute(closed).then(() => {
      setMinutes((current) => upsertMinute(current, closed));
    });
  }, [engine.closedMinute]);

  const nudgeAt = engine.nudge.phase === 'nudging' ? (engine.nudge.nudgeTimes.at(-1) ?? null) : null;
  useEffect(() => {
    if (nudgeAt === null) return;
    if (isHeld(getHolds(), 'posture', Date.now())) return;
    if (settings.chime) playChime();
    if (isQuietHour(settings) || !settings.notifications || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    const current = engineRef.current;
    const inches = baseline && current.readings ? inchesFromBest(baseline, current.readings) : undefined;
    const body = nudgeCopy(current.nudge.issue, inches, current.readings?.screenDistanceIn);
    const note = new Notification('DeskZen', { body });
    note.onclick = () => {
      window.focus();
      note.close();
    };
  }, [nudgeAt, settings, baseline]);

  const patchCounts = useCallback((field: CountField) => {
    const date = localDayKey(Date.now(), timeZone);
    setDayCounts((current) => {
      const next = bumpCount(current, date, field);
      void saveDayCounts(next);
      return next;
    });
  }, [timeZone]);

  const dismissToast = useCallback(() => setEngine((state) => ({ ...state, toast: null })), []);
  const dismissSetup = useCallback(
    () => setEngine((state) => ({ ...state, setupAsk: false, setupMs: 0, setupMuted: true })),
    [],
  );
  const dismissDistance = useCallback(() => {
    learning.noteAlert();
    setEngine((state) => ({ ...state, distanceAlertIn: null, distanceMuted: true }));
  }, [learning]);
  const fixedIt = useCallback(() => {
    const started = Date.now();
    const startScore = scoreRef.current;
    setEngine((state) => ({
      ...state,
      nudge: applyFixedIt(state.nudge, started, postureConfig.nudge.cooldownMinutes * 60_000),
    }));
    window.setTimeout(() => {
      setAdaptive((current) => noteFixedIt(current, scoreRef.current >= startScore + 5));
    }, 10_000);
  }, []);
  const snooze = useCallback(() => {
    learning.noteAlert();
    const issue = engineRef.current.nudge.issue;
    setEngine((state) => ({
      ...state,
      nudge: snoozeNudge(state.nudge, Date.now(), postureConfig.nudge.snoozeMinutes * 60_000),
    }));
    setAdaptive((current) => noteSnooze(current, issue));
  }, [learning]);
  const laterBreak = useCallback(() => {
    learning.noteAlert();
    setEngine((state) => ({
      ...state,
      banner: false,
      breakSnoozeUntilMs: Date.now() + postureConfig.breakSnoozeMs,
    }));
  }, [learning]);
  const startBreak = useCallback(() => setEngine((state) => ({ ...state, onBreak: true, banner: false })), []);
  const cancelBreak = useCallback(() => setEngine((state) => ({ ...state, onBreak: false })), []);
  const finishBreak = useCallback(() => {
    patchCounts('breaks');
    setEngine((state) => ({ ...state, onBreak: false, presenceMs: 0, banner: false }));
  }, [patchCounts]);
  const logWater = useCallback(() => patchCounts('water'), [patchCounts]);
  const startFocus = useCallback((durationMin: number) => {
    const startedAt = Date.now();
    setEngine((state) => ({
      ...state,
      focus: { startedAt, endsAt: startedAt + durationMin * 60_000, durationMin, ended: false },
      nudge: state.nudge.phase === 'nudging' ? { ...state.nudge, phase: 'below' } : state.nudge,
    }));
  }, []);
  const dismissFocus = useCallback(() => setEngine((state) => ({ ...state, focus: null })), []);
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => mergeSettings(current, patch));
  }, []);
  const resetStrictness = useCallback(() => {
    setAdaptive(resetAdaptive());
    setSettings(resetSettings());
  }, []);
  const choosePosture = useCallback((mode: 'sitting' | 'standing') => {
    setPostureMode((current) => setManualMode(current, mode));
  }, []);
  const followPosture = useCallback(() => {
    setPostureMode((current) => ({ ...current, manual: false, manualUntilMs: null }));
  }, []);
  const undoSwitch = useCallback(() => {
    if (!switchToast) return;
    const back = switchToast === 'standing' ? 'sitting' : 'standing';
    setPostureMode((mode) => undoPosture(mode, back, Date.now()));
    setSwitchToast(null);
  }, [switchToast]);
  const dismissSwitch = useCallback(() => setSwitchToast(null), []);
  const dismissStandSuggest = useCallback(() => {
    window.localStorage.setItem('sitglow.standSuggest', today);
    setSuggestDay(today);
    setPostureMode((current) => ({ ...current, suggestStand: false }));
  }, [today]);
  const seedDemo = useCallback(async () => {
    const records = seedMinutes(Date.now(), timeZone);
    await replaceMinutes(records);
    setMinutes(records);
  }, []);
  const exportData = useCallback(async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings: loadSettings(),
      adaptive: loadAdaptive(),
      baseline: await loadBaseline(),
      standingBaseline: await loadStandingBaseline(),
      minutes: await loadMinutes(),
      dayCounts: await loadDayCounts(),
      neckChecks: await loadNeckChecks(),
    };
    downloadJson(`deskzen-${payload.exportedAt.slice(0, 10)}.json`, payload);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      landmarks: vision.landmarks,
      visionStatus: vision.visionStatus,
      visionError: vision.visionError,
      score: engine.score,
      readings: engine.readings,
      nudgePhase: engine.nudge.phase,
      nudgeIssue: engine.nudge.issue,
      toast: engine.toast,
      banner: engine.banner,
      presenceMs: engine.presenceMs,
      distanceAlertIn: engine.distanceAlertIn,
      focus: engine.focus,
      settings,
      threshold,
      minutes,
      dayCounts,
      cameraLive,
      timeZone,
      dismissToast,
      dismissDistance,
      fixedIt,
      snooze,
      laterBreak,
      startBreak,
      finishBreak,
      cancelBreak,
      logWater,
      logHabit: patchCounts,
      startFocus,
      dismissFocus,
      updateSettings,
      resetStrictness,
      posture,
      chosenPosture: postureMode.mode,
      postureManual: postureMode.manual,
      wallMs: engine.wallMs,
      stillMs: engine.standingWatch.stillMs,
      choosePosture,
      followPosture,
      standSignals: postureMode.signals,
      switchToast,
      undoSwitch,
      dismissSwitch,
      suggestStand: postureMode.suggestStand && settings.workStyle !== 'mixed',
      dismissStandSuggest,
      seedDemo,
      exportData,
      setupAsk: engine.setupAsk,
      dismissSetup,
      spotCountdown: spot.countdownSec,
      spotNextDueMs: spot.nextDueMs,
      spotHold: spot.hold,
      spotChecking: spot.checking,
      spotToast: spot.toast,
      spotFixCopy: spot.fixCopy,
      spotFixIssue: spot.fixIssue,
      spotStretchId: spot.stretchId,
      spotDenied: spot.denied,
      spotHistory: spot.history,
      skipSpot: spot.skip,
      snoozeSpot: spot.snooze,
      allowSpotChecks: spot.allowChecks,
      dismissSpotStretch: spot.dismissStretch,
      dismissSpotFix: spot.dismissFix,
      dismissSpotToast: spot.dismissToast,
      reenableCamera: spot.reenable,
      glowAsk: learning.glowAsk,
      acceptGlow: learning.acceptGlow,
      dismissGlowOffer: learning.dismissGlowOffer,
      strictAsk: learning.strictAsk,
      dismissStrict: learning.dismissStrict,
      goodPosture: learning.goodPosture,
      captureGoodPosture: learning.captureGoodPosture,
    }),
    [
      vision.landmarks,
      vision.visionStatus,
      vision.visionError,
      engine,
      settings,
      threshold,
      minutes,
      dayCounts,
      cameraLive,
      dismissToast,
      dismissDistance,
      fixedIt,
      snooze,
      laterBreak,
      startBreak,
      finishBreak,
      cancelBreak,
      logWater,
      patchCounts,
      startFocus,
      dismissFocus,
      updateSettings,
      resetStrictness,
      posture,
      postureMode.mode,
      postureMode.manual,
      postureMode.signals,
      postureMode.suggestStand,
      switchToast,
      choosePosture,
      followPosture,
      undoSwitch,
      dismissSwitch,
      dismissStandSuggest,
      seedDemo,
      exportData,
      dismissSetup,
      learning,
      spot,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
