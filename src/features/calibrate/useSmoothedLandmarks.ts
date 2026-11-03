import { useState } from 'react';
import { smoothLandmarks } from '../../lib/posture/smoothLandmarks';
import type { Landmarks } from '../../lib/posture/types';

export function useSmoothedLandmarks(landmarks: Landmarks | null): Landmarks | null {
  const [smooth, setSmooth] = useState<Landmarks | null>(null);
  if (!landmarks) {
    if (smooth) setSmooth(null);
    return null;
  }
  const next = !smooth || smooth.timestampMs !== landmarks.timestampMs ? smoothLandmarks(smooth, landmarks) : smooth;
  if (next !== smooth) setSmooth(next);
  return next;
}
