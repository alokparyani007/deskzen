import { postureConfig } from './config';
import type { Landmarks } from './types';

export interface HoldMemory {
  key: string;
  stamp: number;
  aligned: boolean;
  phase: 'idle' | 'filling' | 'paused' | 'done';
  accumulatedMs: number;
  lastMs: number | null;
  pauseStartedMs: number | null;
  samples: Landmarks[];
  completed: Landmarks[] | null;
}

export function initialHold(key: string): HoldMemory {
  return {
    key,
    stamp: -1,
    aligned: false,
    phase: 'idle',
    accumulatedMs: 0,
    lastMs: null,
    pauseStartedMs: null,
    samples: [],
    completed: null,
  };
}

export function stepHold(
  previous: HoldMemory,
  landmarks: Landmarks | null,
  aligned: boolean,
  nowMs: number,
  holdMs: number = postureConfig.calibration.holdMs,
): HoldMemory {
  const { driftResetMs } = postureConfig.calibration;
  if (previous.phase === 'done') return { ...previous, stamp: nowMs, aligned };

  if (aligned && landmarks) {
    const add =
      previous.phase === 'filling' && previous.lastMs !== null
        ? Math.max(0, Math.min(500, nowMs - previous.lastMs))
        : 0;
    const accumulatedMs = (previous.phase === 'idle' ? 0 : previous.accumulatedMs) + add;
    const samples = previous.phase === 'idle' ? [landmarks] : [...previous.samples, landmarks];
    if (accumulatedMs >= holdMs) {
      return {
        ...previous,
        stamp: nowMs,
        aligned: true,
        phase: 'done',
        accumulatedMs: holdMs,
        lastMs: nowMs,
        pauseStartedMs: null,
        samples: [],
        completed: samples,
      };
    }
    return {
      ...previous,
      stamp: nowMs,
      aligned: true,
      phase: 'filling',
      accumulatedMs,
      lastMs: nowMs,
      pauseStartedMs: null,
      samples,
      completed: null,
    };
  }

  if (previous.phase === 'idle') return { ...previous, stamp: nowMs, aligned: false };
  const pauseStartedMs = previous.pauseStartedMs ?? nowMs;
  if (nowMs - pauseStartedMs >= driftResetMs) return { ...initialHold(previous.key), stamp: nowMs };
  return {
    ...previous,
    stamp: nowMs,
    aligned: false,
    phase: 'paused',
    pauseStartedMs,
    lastMs: nowMs,
  };
}

export function holdProgress(memory: HoldMemory, holdMs: number = postureConfig.calibration.holdMs): number {
  if (memory.phase === 'idle' || holdMs <= 0) return 0;
  return Math.min(1, memory.accumulatedMs / holdMs);
}
