type Playable = { paused: boolean; srcObject: unknown; play: () => Promise<void> };

function logPlay(video: { paused: boolean }, error?: unknown): void {
  const name = error instanceof Error ? error.name : '';
  // #region agent log
  fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',runId:'post-fix',hypothesisId:'E',location:'resumeVideo.ts:play',message:error ? 'play rejected' : 'play resolved',data:{paused:video.paused,name},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

/** The element can keep paused=false after a DOM move and still show a frozen frame. Pause, then play, so the new parent gets a fresh frame. */
export function restartAfterMove(video: Playable & { pause: () => void }): void {
  if (!video.srcObject) return;
  if (!video.paused) video.pause();
  void video.play().then(() => logPlay(video)).catch((error: unknown) => logPlay(video, error));
}

/** Moving a video element in the DOM pauses it. Play does not restart on its own. */
export function resumeIfPaused(video: Playable): void {
  if (!video.srcObject || !video.paused) return;
  void video.play().then(() => {
    // #region agent log
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',hypothesisId:'A',location:'resumeVideo.ts:play',message:'play resolved',data:{paused:video.paused},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }).catch((error: unknown) => {
    const name = error instanceof Error ? error.name : 'unknown';
    // #region agent log
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',hypothesisId:'A',location:'resumeVideo.ts:play',message:'play rejected',data:{name},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  });
}
