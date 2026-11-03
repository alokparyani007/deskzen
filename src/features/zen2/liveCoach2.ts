import { zenConfig } from './zenConfig';

export type CoachPhase = 'ontrack' | 'drifting' | 'away';

export interface LiveCoachState {
  phase: CoachPhase;
  belowSince: number | null;
  recoverSince: number | null;
  absentSince: number | null;
  framingText: string | null;
  framingSince: number | null;
  lastVoiceMs: number;
  tipVoiceMs: Record<string, number>;
  guideUntilMs: number;
  returns: number;
}

export interface LiveCoachInput {
  nowMs: number;
  fit: number | null;
  poseVisible: boolean;
  faceCount: number;
  framing: string | null;
  tipId: string | null;
  tipTitle: string | null;
}

export interface LiveCoachView {
  state: LiveCoachState;
  phase: CoachPhase;
  stepIntoView: boolean;
  framingPill: string | null;
  speak: string | null;
  guiding: boolean;
}

export function initialLiveCoach(nowMs = 0): LiveCoachState {
  return {
    phase: 'ontrack',
    belowSince: null,
    recoverSince: null,
    absentSince: null,
    framingText: null,
    framingSince: null,
    lastVoiceMs: nowMs - zenConfig.voiceGapMs,
    tipVoiceMs: {},
    guideUntilMs: 0,
    returns: 0,
  };
}

export function stepLiveCoach(state: LiveCoachState, input: LiveCoachInput): LiveCoachView {
  const next: LiveCoachState = {
    ...state,
    tipVoiceMs: { ...state.tipVoiceMs },
  };
  let speak: string | null = null;
  if (!input.poseVisible) {
    next.absentSince = next.absentSince ?? input.nowMs;
    next.belowSince = null;
    next.recoverSince = null;
    if (input.nowMs - next.absentSince >= zenConfig.presenceHoldMs) next.phase = 'away';
  } else {
    next.absentSince = null;
    if (next.phase === 'away') next.phase = 'ontrack';
    const fit = input.fit;
    if (fit !== null && fit < zenConfig.driftBelow) {
      next.belowSince = next.belowSince ?? input.nowMs;
      next.recoverSince = null;
      if (next.phase === 'ontrack' && input.nowMs - next.belowSince >= zenConfig.driftHoldMs) {
        next.phase = 'drifting';
        speak = input.tipTitle;
      }
    } else if (fit !== null && fit >= zenConfig.onTrackAt) {
      next.belowSince = null;
      if (next.phase === 'drifting') {
        next.recoverSince = next.recoverSince ?? input.nowMs;
        if (input.nowMs - next.recoverSince >= zenConfig.recoverHoldMs) {
          next.phase = 'ontrack';
          next.returns += 1;
          speak = "Nice, that's your Zen.";
        }
      } else {
        next.recoverSince = null;
      }
    } else {
      next.belowSince = null;
      next.recoverSince = null;
    }
  }
  if (input.framing && input.poseVisible) {
    if (next.framingText !== input.framing) {
      next.framingText = input.framing;
      next.framingSince = input.nowMs;
    }
  } else {
    next.framingText = null;
    next.framingSince = null;
  }
  const framingPill = next.framingText && next.framingSince !== null && input.nowMs - next.framingSince >= zenConfig.framingHoldMs ? next.framingText : null;
  const spoken = speakVoice(next, input.nowMs, speak, input.tipId);
  return {
    state: next,
    phase: next.phase,
    stepIntoView: next.phase === 'away',
    framingPill,
    speak: spoken,
    guiding: input.nowMs < next.guideUntilMs,
  };
}

export function beginGuide(state: LiveCoachState, nowMs: number, tipId: string | null, tipTitle: string | null): LiveCoachView {
  const next: LiveCoachState = { ...state, tipVoiceMs: { ...state.tipVoiceMs }, guideUntilMs: nowMs + zenConfig.guideMs };
  const speak = speakVoice(next, nowMs, tipTitle, tipId);
  return { state: next, phase: next.phase, stepIntoView: next.phase === 'away', framingPill: null, speak, guiding: true };
}

function speakVoice(state: LiveCoachState, nowMs: number, line: string | null, tipId: string | null): string | null {
  if (!line) return null;
  const key = tipId ?? line;
  const lastTip = state.tipVoiceMs[key];
  if (nowMs - state.lastVoiceMs < zenConfig.voiceGapMs) return null;
  if (lastTip !== undefined && nowMs - lastTip < zenConfig.voiceTipMs) return null;
  state.lastVoiceMs = nowMs;
  state.tipVoiceMs[key] = nowMs;
  return line;
}

/** Pose is visible when a nose, an eye, or a shoulder clears the away threshold. Face count never decides this. */
export function poseIsVisible(vis: { nose?: number; leftEye?: number; rightEye?: number; leftShoulder?: number; rightShoulder?: number }): boolean {
  const values = [vis.nose, vis.leftEye, vis.rightEye, vis.leftShoulder, vis.rightShoulder];
  return values.some((value) => typeof value === 'number' && value >= zenConfig.awayVis);
}
