import { postureConfig } from '../posture/config';
import { setupViewChanged } from '../posture/glow';
import { focalFor } from '../posture/resolution';
import { frameSignals } from '../posture/signals';
import { initialNudgeState, stepNudge, type NudgeState } from '../posture/nudges';
import { readSignals, type MotionMemory } from '../posture/readSignals';
import { labelFor, scoreFrame, smoothToward } from '../posture/score';
import { initialStandingWatch, standingFrame, type StandingWatch } from '../posture/standing';
import type { Baseline, Landmarks, PostureScore, SignalKey, SignalReadings } from '../posture/types';
import { migrateMinute, type MinuteRecord } from '../progress/aggregate';

export interface FocusSession {
  startedAt: number;
  endsAt: number;
  durationMin: number;
  ended: boolean;
}

export interface EngineState {
  wallMs: number | null;
  score: PostureScore | null;
  readings: SignalReadings | null;
  motion: MotionMemory;
  nudge: NudgeState;
  qualitySamples: { t: number; good: boolean }[];
  presenceMs: number;
  absentMs: number;
  breakSnoozeUntilMs: number | null;
  banner: boolean;
  onBreak: boolean;
  distanceLowMs: number;
  distanceMuted: boolean;
  distanceAlertIn: number | null;
  toast: string | null;
  focus: FocusSession | null;
  bucket: { minute: number; sum: number; n: number } | null;
  closedMinute: MinuteRecord | null;
  fixWatch: { at: number; score: number } | null;
  standingWatch: StandingWatch;
  setupMs: number;
  setupAsk: boolean;
  setupMuted: boolean;
  setupBaselineAt: string | null;
}

export interface StepOptions {
  threshold: number;
  sustainMs: number;
  weightScale: Partial<Record<SignalKey, number>>;
  breakMs: number;
  distanceAlerts: boolean;
  pose?: 'sit' | 'stand';
  deskTips?: boolean;
}

export function initialEngine(): EngineState {
  return {
    wallMs: null,
    score: null,
    readings: null,
    motion: { movingUntilMs: 0 },
    nudge: initialNudgeState(),
    qualitySamples: [],
    presenceMs: 0,
    absentMs: 0,
    breakSnoozeUntilMs: null,
    banner: false,
    onBreak: false,
    distanceLowMs: 0,
    distanceMuted: false,
    distanceAlertIn: null,
    toast: null,
    focus: null,
    bucket: null,
    closedMinute: null,
    fixWatch: null,
    standingWatch: initialStandingWatch(),
    setupMs: 0,
    setupAsk: false,
    setupMuted: false,
    setupBaselineAt: null,
  };
}

export function stepEngine(
  state: EngineState,
  landmarks: Landmarks,
  wallMs: number,
  baseline: Baseline,
  options: StepOptions,
): EngineState {
  const dtMs = state.wallMs === null ? 0 : Math.max(0, wallMs - state.wallMs);
  const sensed = readSignals(landmarks, baseline, state.motion);
  const good = sensed.readings.quality === 'good';
  const samples = [...state.qualitySamples, { t: wallMs, good }].filter((sample) => wallMs - sample.t <= 5000);
  const quality = samples.length === 0 ? 0 : samples.filter((sample) => sample.good).length / samples.length;

  let score = state.score;
  if (good) {
    const dtSeconds = state.score && state.wallMs !== null ? Math.min(1, dtMs / 1000) : 0;
    score = {
      ...scoreFrame(sensed.readings, state.score ?? undefined, dtSeconds, quality, options.weightScale),
      timestampMs: wallMs,
    };
  } else if (state.score) {
    score = { ...state.score, quality, timestampMs: wallMs };
  }

  let standingWatch = state.standingWatch;
  if (options.pose === 'stand' && good && score) {
    const stood = standingFrame(landmarks, baseline, state.score, dtMs, standingWatch, options.deskTips !== false);
    standingWatch = stood.watch;
    const dtSeconds = state.score && state.wallMs !== null ? Math.min(1, dtMs / 1000) : 0;
    const smoothed = state.score ? smoothToward(state.score.smoothed, stood.raw, dtSeconds) : stood.raw;
    score = { ...score, raw: stood.raw, smoothed, label: labelFor(smoothed), cue: stood.cue ?? undefined, dominantIssue: stood.issue ?? score.dominantIssue };
  }

  const absentMs = good || sensed.readings.quality !== 'absent' ? 0 : state.absentMs + dtMs;
  let presenceMs = state.presenceMs;
  if (sensed.readings.quality !== 'absent' || absentMs < 10_000) {
    presenceMs += Math.min(dtMs, 2000);
  }

  const focusQuiet = Boolean(state.focus && !state.focus.ended && wallMs < state.focus.endsAt);
  const focus =
    state.focus && !state.focus.ended && wallMs >= state.focus.endsAt ? { ...state.focus, ended: true } : state.focus;

  let nudge = state.nudge;
  let toast = state.toast;
  if (score) {
    const stepped = stepNudge(state.nudge, {
      nowMs: wallMs,
      score: score.smoothed,
      good,
      threshold: options.threshold,
      sustainMs: options.sustainMs,
      cooldownMs: postureConfig.nudge.cooldownMinutes * 60_000,
      snoozeMs: postureConfig.nudge.snoozeMinutes * 60_000,
      maxPerHour: postureConfig.nudge.maxPerHour,
      focusQuiet,
      issue: score.dominantIssue,
    });
    nudge = stepped.state;
    if (stepped.recovered) toast = `Perfect! Posture back to ${Math.round(score.smoothed)}`;
  }

  const snoozeClear = state.breakSnoozeUntilMs === null || wallMs >= state.breakSnoozeUntilMs;
  const banner = state.onBreak ? false : presenceMs >= options.breakMs && snoozeClear;

  let distanceLowMs = state.distanceLowMs;
  let distanceMuted = state.distanceMuted;
  let distanceAlertIn = state.distanceAlertIn;
  const inches = sensed.readings.screenDistanceIn;
  if (!options.distanceAlerts || inches === undefined || inches >= postureConfig.minComfortIn) {
    distanceLowMs = 0;
    distanceMuted = false;
    distanceAlertIn = null;
  } else {
    distanceLowMs += Math.min(dtMs, 2000);
    if (!distanceMuted && distanceLowMs >= postureConfig.distanceAlertMs) {
      distanceAlertIn = Math.max(1, Math.round(inches));
    }
  }

  const baselineChanged = state.setupBaselineAt !== baseline.createdAt;
  const setupMuted = baselineChanged ? false : state.setupMuted;
  let setupMs = baselineChanged || setupMuted ? 0 : state.setupMs;
  let setupAsk = baselineChanged ? false : state.setupAsk;
  if (!setupMuted && good) {
    const signals = frameSignals(landmarks, focalFor(landmarks, baseline));
    const noseY = landmarks.nose && landmarks.videoHeight > 0 ? landmarks.nose.y / landmarks.videoHeight : undefined;
    const shifted = setupViewChanged(baseline, {
      ipdPx: signals.ipdPx,
      shoulderAngleDeg: signals.shoulderAngleDeg,
      noseY,
      videoWidth: landmarks.videoWidth,
    });
    setupMs = shifted ? setupMs + Math.min(dtMs, 2000) : 0;
    if (setupMs >= 5000) setupAsk = true;
  } else if (!good) {
    setupMs = 0;
  }

  let bucket = state.bucket;
  let closedMinute = state.closedMinute;
  if (good && score) {
    const minute = Math.floor(wallMs / 60_000);
    if (!bucket || bucket.minute !== minute) {
      if (bucket && bucket.n > 0) closedMinute = migrateMinute({ minute: bucket.minute, score: bucket.sum / bucket.n, mode: options.pose === 'stand' ? 'stand' : 'sit' });
      bucket = { minute, sum: score.smoothed, n: 1 };
    } else {
      bucket = { minute, sum: bucket.sum + score.smoothed, n: bucket.n + 1 };
    }
  }

  return {
    ...state,
    wallMs,
    score,
    readings: sensed.readings,
    motion: sensed.motion,
    nudge,
    qualitySamples: samples,
    presenceMs,
    absentMs,
    banner,
    distanceLowMs,
    distanceMuted,
    distanceAlertIn,
    toast,
    focus,
    bucket,
    closedMinute,
    standingWatch,
    setupMs,
    setupAsk,
    setupMuted,
    setupBaselineAt: baseline.createdAt,
  };
}

export function stepPresence(state: EngineState, dtMs: number, nowMs: number, breakMs: number): EngineState {
  const presenceMs = state.presenceMs + Math.max(0, dtMs);
  const snoozeClear = state.breakSnoozeUntilMs === null || nowMs >= state.breakSnoozeUntilMs;
  const focus =
    state.focus && !state.focus.ended && nowMs >= state.focus.endsAt ? { ...state.focus, ended: true } : state.focus;
  return {
    ...state,
    wallMs: nowMs,
    presenceMs,
    focus,
    banner: state.onBreak ? false : presenceMs >= breakMs && snoozeClear,
  };
}
