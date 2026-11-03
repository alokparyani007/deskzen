const MAX_WIDTH = 640;
const SLOW_MS = 1000 / 12;
const FAST_MS = 1000 / 20;

let samples: number[] = [];
let slow = false;
let offscreen: OffscreenCanvas | null = null;
let fallback: HTMLCanvasElement | null = null;

/** Record one pose or segmentation pass. Below ~12 fps, later frames are downscaled. */
export function noteInference(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  samples = [...samples, ms].slice(-8);
  if (samples.length < 4) return;
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (average > SLOW_MS) slow = true;
  else if (average < FAST_MS) slow = false;
}

export function inferenceIsSlow(): boolean {
  return slow;
}

export type InferenceSource = HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas;

/** Full video while the model keeps up. A max-640 canvas when it does not. Display stays HD. */
export function frameForInference(video: HTMLVideoElement): InferenceSource {
  if (!slow || video.videoWidth <= MAX_WIDTH || video.videoHeight <= 0) return video;
  const width = MAX_WIDTH;
  const height = Math.max(1, Math.round((video.videoHeight * MAX_WIDTH) / video.videoWidth));
  const offscreenFrame = paintOffscreen(video, width, height);
  if (offscreenFrame) return offscreenFrame;
  return paintCanvas(video, width, height);
}

function paintOffscreen(video: HTMLVideoElement, width: number, height: number): OffscreenCanvas | null {
  if (typeof OffscreenCanvas === 'undefined') return null;
  if (!offscreen || offscreen.width !== width || offscreen.height !== height) offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  return offscreen;
}

function paintCanvas(video: HTMLVideoElement, width: number, height: number): HTMLCanvasElement {
  if (!fallback || fallback.width !== width || fallback.height !== height) {
    fallback = document.createElement('canvas');
    fallback.width = width;
    fallback.height = height;
  }
  fallback.getContext('2d')?.drawImage(video, 0, 0, width, height);
  return fallback;
}
