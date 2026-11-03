type Playable = { paused: boolean; srcObject: unknown; play: () => Promise<void> };

/** The element can keep paused=false after a DOM move and still show a frozen frame. Pause, then play, so the new parent gets a fresh frame. */
export function restartAfterMove(video: Playable & { pause: () => void }): void {
  if (!video.srcObject) return;
  if (!video.paused) video.pause();
  void video.play().catch(() => {});
}

/** Moving a video element in the DOM pauses it. Play does not restart on its own. */
export function resumeIfPaused(video: Playable): void {
  if (!video.srcObject || !video.paused) return;
  void video.play().catch(() => {});
}
