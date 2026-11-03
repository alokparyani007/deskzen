export interface TrackedStream {
  getTracks(): Array<{ stop: () => void }>;
}

export function stopCameraTracks(stream: TrackedStream | null): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* Keep stopping the rest so the camera light goes off. */
    }
  }
}

/** Opens the camera, runs the sample, and always stops every track. */
export async function withCamera<T>(open: () => Promise<TrackedStream>, run: (stream: TrackedStream) => Promise<T>): Promise<T> {
  let stream: TrackedStream | null = null;
  try {
    stream = await open();
    return await run(stream);
  } finally {
    stopCameraTracks(stream);
  }
}

export type CameraProblem = 'busy' | 'denied' | 'unavailable';

export function classifyCameraError(name: string | null): CameraProblem {
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') return 'denied';
  return 'unavailable';
}
