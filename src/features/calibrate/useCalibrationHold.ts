import { useEffect, useRef, useState } from 'react';
import { holdProgress, initialHold, stepHold, type HoldMemory } from '../../lib/posture/calibrationHold';
import type { Landmarks } from '../../lib/posture/types';

interface HoldState {
  holding: boolean;
  paused: boolean;
  ticking: boolean;
  progress: number;
}

export function useCalibrationHold(
  landmarks: Landmarks | null,
  aligned: boolean,
  enabled: boolean,
  attempt: number,
  onComplete: (samples: Landmarks[]) => void,
  holdMs: number = 5000,
): HoldState {
  const key = `${enabled ? 1 : 0}|${attempt}|${holdMs}`;
  const stamp = landmarks?.timestampMs ?? -1;
  const [memory, setMemory] = useState<HoldMemory>(() => initialHold(key));

  if (memory.key !== key) {
    setMemory(initialHold(key));
  } else if (memory.phase !== 'done' && (memory.stamp !== stamp || memory.aligned !== aligned)) {
    const nowMs = stamp >= 0 ? stamp : (memory.lastMs ?? 0);
    const next = stepHold(memory, landmarks, aligned && landmarks !== null, nowMs, holdMs);
    setMemory({ ...next, stamp });
  }

  const completed = memory.completed;
  const sent = useRef<Landmarks[] | null>(null);
  useEffect(() => {
    if (!completed || sent.current === completed) return;
    sent.current = completed;
    onComplete(completed);
  }, [completed, onComplete]);

  return {
    holding: memory.phase === 'filling' || memory.phase === 'paused',
    paused: memory.phase === 'paused',
    ticking: memory.phase === 'filling',
    progress: holdProgress(memory, holdMs),
  };
}
