export const CAMERA_NUDGE_MS = 2_000;
export const CAMERA_PAUSE_MS = 4_000;

/** Landmarks went quiet while the picture itself is paused. Nudge play once, then show the bar. */
export function cameraWatchStep(input: { landmarkStaleMs: number; videoPaused: boolean; nudged: boolean }): { nudge: boolean; showPaused: boolean } {
  const stuck = input.videoPaused && input.landmarkStaleMs >= CAMERA_NUDGE_MS;
  return {
    nudge: stuck && !input.nudged,
    showPaused: input.videoPaused && input.landmarkStaleMs >= CAMERA_PAUSE_MS,
  };
}
