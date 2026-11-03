import { postureConfig } from './config';

export interface GreatState {
  steadyMs: number;
  lastMs: number | null;
}

export function initialGreat(): GreatState {
  return { steadyMs: 0, lastMs: null };
}

/** Top band of the 0–100 score, held steady. Ready once, the caller limits it to once a day. */
export function stepGreatMoment(
  state: GreatState,
  input: { nowMs: number; score: number; good: boolean; top?: number; needMs?: number },
): { state: GreatState; ready: boolean } {
  const top = input.top ?? postureConfig.glow.greatScore;
  const needMs = input.needMs ?? postureConfig.glow.greatSteadyMs;
  const dt = state.lastMs === null ? 0 : Math.min(2000, Math.max(0, input.nowMs - state.lastMs));
  if (!input.good || input.score < top) {
    return { state: { steadyMs: 0, lastMs: input.nowMs }, ready: false };
  }
  const steadyMs = state.steadyMs + dt;
  return { state: { steadyMs, lastMs: input.nowMs }, ready: steadyMs >= needMs };
}

export function noteAlertDismiss(times: number[], nowMs: number, windowMs = postureConfig.glow.strictWindowMs): number[] {
  return [...times, nowMs].filter((time) => nowMs - time <= windowMs && nowMs - time >= 0);
}

export function tooStrict(times: number[], needed = postureConfig.glow.strictCount): boolean {
  return times.length >= needed;
}
