import { postureConfig } from './config';
import type { SignalKey } from './types';

export interface AdaptiveState {
  threshold: number;
  sustainSeconds: number;
  weightScale: Record<SignalKey, number>;
  fastFixes: number;
}

export function initialAdaptiveState(): AdaptiveState {
  return {
    threshold: postureConfig.nudge.threshold,
    sustainSeconds: postureConfig.nudge.sustainSeconds,
    weightScale: { lean: 1, headDrop: 1, shoulders: 1, tilt: 1, distance: 1 },
    fastFixes: 0,
  };
}

export function noteFixedIt(state: AdaptiveState, improvedQuickly: boolean): AdaptiveState {
  if (!improvedQuickly) return { ...state, fastFixes: 0 };
  const fastFixes = state.fastFixes + 1;
  if (fastFixes < 3) return { ...state, fastFixes };
  return { ...state, fastFixes: 0, threshold: Math.min(75, state.threshold + 1) };
}

export function noteSnooze(state: AdaptiveState, signal: SignalKey | undefined): AdaptiveState {
  const weightScale = { ...state.weightScale };
  if (signal) weightScale[signal] = Math.max(0.5, weightScale[signal] * 0.9);
  return {
    ...state,
    fastFixes: 0,
    threshold: Math.max(50, state.threshold - 2),
    sustainSeconds: Math.min(90, state.sustainSeconds + 5),
    weightScale,
  };
}

export function resetAdaptive(): AdaptiveState {
  return initialAdaptiveState();
}
