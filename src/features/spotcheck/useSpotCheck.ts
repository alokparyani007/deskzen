import { useEffect, useRef, useState } from 'react';
import { isZenPath } from '../../app/zenPath';
import { playChime } from '../../lib/chime';
import type { MotionMemory } from '../../lib/posture/readSignals';
import { postureConfig } from '../../lib/posture/config';
import { getHolds, isHeld } from '../../lib/reminders/holds';
import { classifyCameraError } from '../../lib/spotcheck/camera';
import {
  SPOT_WARMUP_MS,
  finishSpot,
  initialSpotSchedule,
  isQuietWindow,
  isWorkDay,
  noteCameraBusy,
  skipSpot,
  snoozeSpot,
  releaseSpot,
  stepSpotSchedule,
  type SpotSchedule,
} from '../../lib/spotcheck/schedule';
import { scoreSpotFrame } from '../../lib/spotcheck/sample';
import { appendSpot, loadSpotHistory, repeatedIssue, saveSpotHistory, stretchForIssue, type SpotRecord } from '../../lib/spotcheck/history';
import { alertPlan, spotAlertCopy, verdictFromFrames, type SpotFrame, type SpotIssue } from '../../lib/spotcheck/verdict';
import type { AppSettings } from '../../lib/settings/defaults';
import type { Baseline, Landmarks } from '../../lib/posture/types';

export type SpotHold = 'glow' | 'workday' | 'quiet' | 'paused' | 'focus' | null;

export interface SpotView {
  countdownSec: number | null;
  /** When the next check is due (epoch ms). Null when checks are off. */
  nextDueMs: number | null;
  hold: SpotHold;
  checking: boolean;
  toast: string | null;
  fixCopy: string | null;
  fixIssue: SpotIssue | null;
  stretchId: string | null;
  denied: boolean;
  history: SpotRecord[];
  skip: () => void;
  snooze: () => void;
  allowChecks: () => void;
  dismissStretch: () => void;
  dismissFix: () => void;
  dismissToast: () => void;
  reenable: () => void;
}

interface SpotInput {
  enabled: boolean;
  settings: AppSettings;
  landmarks: Landmarks | null;
  wallMs: number | null;
  confidence: number;
  baseline: Baseline | null;
  standing: Baseline | null;
  threshold: number;
  focusActive: boolean;
  fixRoute: boolean;
  cameraLive: boolean;
  setSpotVision: (on: boolean) => void;
  start: () => Promise<boolean>;
  pause: () => void;
  lastError: () => string | null;
}

export function useSpotCheck(input: SpotInput): SpotView {
  const inputRef = useRef(input);
  const checkingRef = useRef(false);
  const historyRef = useRef<SpotRecord[]>([]);
  const scheduleRef = useRef<SpotSchedule | null>(null);
  const samples = useRef<SpotFrame[]>([]);
  const votes = useRef<Array<'sitting' | 'standing'>>([]);
  const motion = useRef<MotionMemory>({ movingUntilMs: 0 });
  const openedAt = useRef<number | null>(null);
  const closed = useRef(false);
  const lastTick = useRef('');
  const deferLog = useRef(false);
  const postponed = useRef(false);
  const sawFrame = useRef(false);
  const sawPose = useRef(false);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);
  const [nextDueMs, setNextDueMs] = useState<number | null>(null);
  const [hold, setHold] = useState<SpotHold>(null);
  const [checking, setChecking] = useState(false);
  const [sampling, setSampling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [fixCopy, setFixCopy] = useState<string | null>(null);
  const [fixIssue, setFixIssue] = useState<SpotIssue | null>(null);
  const [stretchId, setStretchId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [history, setHistory] = useState<SpotRecord[]>(() => loadSpotHistory());

  useEffect(() => {
    inputRef.current = input;
    historyRef.current = history;
  });

  useEffect(() => {
    if (!input.enabled) return;
    const tick = () => {
      const current = inputRef.current;
      const every = current.settings.spotEveryMin * 60_000;
      const now = new Date();
      let state = scheduleRef.current ?? initialSpotSchedule(now.getTime(), every);
      if (state.nextDueMs - now.getTime() > every) state = { ...state, nextDueMs: now.getTime() + every };
      const onCalibrate = isZenPath(window.location.pathname);
      const onLive = window.location.pathname.startsWith('/live');
      const onHome = window.location.pathname === '/app';
      const cameraPage = onLive || onHome;
      if ((onCalibrate || cameraPage) && checkingRef.current) {
        closed.current = true;
        checkingRef.current = false;
        setChecking(false);
        setSampling(false);
        current.setSpotVision(false);
        setToast(null);
        if (scheduleRef.current?.inFlight) scheduleRef.current = finishSpot(scheduleRef.current);
      }
      if (onCalibrate || cameraPage) setToast((value) => (value === null ? value : null));
      const glowBusy = onCalibrate && !checkingRef.current;
      const cameraBusy = cameraPage && !checkingRef.current;
      if ((glowBusy || cameraBusy) && state.nextDueMs <= now.getTime()) {
        state = { ...state, nextDueMs: now.getTime() + every };
        if (!postponed.current) {
          postponed.current = true;
        }
      } else if (!onCalibrate) postponed.current = false;
      const guarded = current.fixRoute || checkingRef.current || glowBusy || cameraBusy ? { ...state, inFlight: true } : state;
      const stepped = stepSpotSchedule(guarded, {
        nowMs: now.getTime(),
        everyMs: every,
        // One quiet hours setting for everything; Snooze all also pauses checks.
        quiet: (current.settings.quietHours && isQuietWindow(current.settings.quietStart, current.settings.quietEnd, now)) || isHeld(getHolds(), 'spot', now.getTime()),
        workDay: isWorkDay(now, current.settings.spotWorkDays),
        focusActive: current.focusActive,
        skipFocus: current.settings.spotSkipFocus,
        hidden: document.hidden,
      });
      if (!current.fixRoute && !checkingRef.current) scheduleRef.current = glowBusy || cameraBusy ? { ...state, inFlight: false } : stepped.state;
      if (glowBusy && now.getTime() >= state.nextDueMs && !deferLog.current) {
        deferLog.current = true;
      }
      if (!glowBusy) deferLog.current = false;
      setCountdownSec(stepped.countdownSec);
      const signature = `${stepped.action}|${every}|${stepped.countdownSec ?? ''}`;
      if (signature !== lastTick.current) {
        lastTick.current = signature;
      }
      const quietNow = current.settings.quietHours && isQuietWindow(current.settings.quietStart, current.settings.quietEnd, now);
      const dueAt = scheduleRef.current?.nextDueMs ?? null;
      setNextDueMs((value) => (value === dueAt ? value : dueAt));
      const workDay = isWorkDay(now, current.settings.spotWorkDays);
      const nextHold: SpotHold =
        quietNow && !workDay
          ? 'paused'
          : stepped.action === 'offday'
            ? 'workday'
            : stepped.action === 'quiet'
              ? quietNow
                ? 'quiet'
                : null
              : stepped.action === 'focus'
                ? 'focus'
                : !current.baseline
                  ? 'glow'
                  : null;
      setHold(nextHold);
      if (nextHold === 'glow' && (stepped.action === 'countdown' || stepped.action === 'fire')) {
        setCountdownSec(null);
        if (stepped.action === 'fire') {
          if (scheduleRef.current?.inFlight) scheduleRef.current = finishSpot(scheduleRef.current);
          return;
        }
      }
      if (stepped.action === 'fire') void begin();
    };
    const id = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [input.enabled]);

  useEffect(() => {
    if (!sampling || openedAt.current === null) return;
    if (!sawFrame.current) sawFrame.current = true;
    if (!input.landmarks) return;
    if (!sawPose.current) {
      sawPose.current = true;
    }
    const elapsed = Date.now() - openedAt.current;
    if (elapsed < SPOT_WARMUP_MS) return;
    const posture = poseNow();
    votes.current.push(posture);
    const sitting = input.baseline;
    const stood = input.standing;
    const baseline = posture === 'standing' && stood ? stood : sitting;
    if (!baseline) return;
    const scored = scoreSpotFrame(input.landmarks, baseline, posture === 'standing' && stood ? 'standing' : 'sitting', motion.current);
    motion.current = scored.motion;
    samples.current.push(scored.frame);
    if (elapsed < SPOT_WARMUP_MS + input.settings.spotLengthSec * 1000) return;
    complete(posture);
  }, [sampling, input.landmarks, input.wallMs, input.baseline, input.standing, input.settings.spotLengthSec]);

  useEffect(() => {
    if (!sampling) return;
    const limit = SPOT_WARMUP_MS + input.settings.spotLengthSec * 1000 + 4_000;
    const id = window.setTimeout(() => stopEarly(), limit);
    return () => window.clearTimeout(id);
  }, [sampling, input.settings.spotLengthSec]);

  function poseNow(): 'sitting' | 'standing' {
    const current = inputRef.current;
    if (current.settings.workStyle === 'stand') return 'standing';
    if (current.settings.workStyle === 'sit') return 'sitting';
    if (current.confidence >= postureConfig.standing.standConfidence && current.standing) return 'standing';
    return 'sitting';
  }

  async function begin(): Promise<void> {
    const current = inputRef.current;
    if (!current.baseline || checkingRef.current) {
      if (scheduleRef.current?.inFlight) scheduleRef.current = finishSpot(scheduleRef.current);
      return;
    }
    checkingRef.current = true;
    closed.current = false;
    samples.current = [];
    votes.current = [];
    motion.current = { movingUntilMs: 0 };
    openedAt.current = null;
    sawFrame.current = false;
    sawPose.current = false;
    setChecking(true);
    current.setSpotVision(true);
    try {
      const ok = await current.start();
      if (!ok) {
        const problem = classifyCameraError(current.lastError());
        if (problem === 'busy' && scheduleRef.current) scheduleRef.current = noteCameraBusy(scheduleRef.current, Date.now());
        if (problem === 'denied') setDenied(true);
        current.pause();
        endVision();
        return;
      }
      if (closed.current || isZenPath(window.location.pathname)) {
        endVision();
        if (scheduleRef.current?.inFlight) scheduleRef.current = finishSpot(scheduleRef.current);
        return;
      }
      setDenied(false);
      openedAt.current = Date.now();
      setSampling(true);
    } catch {
      current.pause();
      endVision();
    }
  }

  function complete(posture: 'sitting' | 'standing'): void {
    if (closed.current) return;
    closed.current = true;
    const current = inputRef.current;
    const keepCamera = isZenPath(window.location.pathname) || window.location.pathname.startsWith('/live') || window.location.pathname === '/app';
    if (!keepCamera) current.pause();
    const verdict = verdictFromFrames(samples.current, current.threshold);
    const standingVotes = votes.current.filter((vote) => vote === 'standing').length;
    const used = standingVotes > votes.current.length / 2 ? 'standing' : posture;
    const record: SpotRecord = { at: Date.now(), posture: used, score: verdict.score, issue: verdict.issue, outcome: verdict.outcome };
    const next = appendSpot(historyRef.current, record);
    historyRef.current = next;
    saveSpotHistory(next);
    setHistory(next);
    const repeat = repeatedIssue(next);
    if (repeat && current.settings.stretchSuggestions) setStretchId(stretchForIssue(repeat));
    const plan = alertPlan(verdict.outcome);
    if (plan.toast && !keepCamera) setToast(plan.toast);
    if (plan.notify) {
      const copy = spotAlertCopy(verdict.issue);
      setFixCopy(copy);
      setFixIssue(verdict.issue);
      notify(copy, verdict.issue);
      if (current.settings.spotSound) playChime();
    }
    if (scheduleRef.current) scheduleRef.current = finishSpot(scheduleRef.current);
    endVision();
  }

  function stopEarly(): void {
    if (closed.current) return;
    if (samples.current.length > 0) {
      complete(poseNow());
      return;
    }
    closed.current = true;
    if (!isZenPath(window.location.pathname)) inputRef.current.pause();
    const away: SpotRecord = { at: Date.now(), posture: poseNow(), score: null, issue: null, outcome: 'away' };
    const next = appendSpot(historyRef.current, away);
    historyRef.current = next;
    saveSpotHistory(next);
    setHistory(next);
    if (scheduleRef.current) scheduleRef.current = finishSpot(scheduleRef.current);
    endVision();
  }

  function endVision(): void {
    checkingRef.current = false;
    setChecking(false);
    setSampling(false);
    inputRef.current.setSpotVision(false);
  }

  function notify(body: string, issue: SpotIssue | null): void {
    const current = inputRef.current;
    if (!current.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
    const note = new Notification('DeskZen', { body });
    note.onclick = () => {
      window.focus();
      window.location.assign(`/spot-fix?issue=${issue ?? 'lean'}`);
      note.close();
    };
  }

  function skip(): void {
    const every = inputRef.current.settings.spotEveryMin * 60_000;
    scheduleRef.current = skipSpot(scheduleRef.current ?? initialSpotSchedule(Date.now(), every), Date.now(), every);
    setCountdownSec(null);
  }

  function allowChecks(): void {
    const every = inputRef.current.settings.spotEveryMin * 60_000;
    scheduleRef.current = releaseSpot(scheduleRef.current ?? initialSpotSchedule(Date.now(), every), Date.now());
    setHold(null);
    setCountdownSec(null);
  }

  function snooze(): void {
    scheduleRef.current = snoozeSpot(scheduleRef.current ?? initialSpotSchedule(Date.now(), 60_000), Date.now());
    setFixCopy(null);
    setCountdownSec(null);
  }

  const holdShown: SpotHold = hold === 'glow' && input.baseline ? null : hold;
  return {
    countdownSec,
    nextDueMs: input.enabled ? nextDueMs : null,
    hold: holdShown,
    checking,
    toast,
    fixCopy,
    fixIssue,
    stretchId,
    denied,
    history,
    skip,
    snooze,
    allowChecks,
    dismissStretch: () => setStretchId(null),
    dismissFix: () => setFixCopy(null),
    dismissToast: () => setToast(null),
    reenable: () => {
      void inputRef.current.start().then((ok) => {
        if (!ok) return;
        inputRef.current.pause();
        setDenied(false);
      });
    },
  };
}
