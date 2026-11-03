export interface CapturedFrame {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  width: number;
  height: number;
  dispose: () => void;
}

/** One video frame in memory. dispose() drops the pixels. Never exported as a blob or data URL. */
export function captureFrame(video: HTMLVideoElement): CapturedFrame | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width <= 0 || height <= 0) return null;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  let gone = false;
  return {
    canvas,
    width,
    height,
    dispose() {
      if (gone) return;
      gone = true;
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}

export function pictureIsGone(frame: CapturedFrame | null): boolean {
  return frame === null || frame.canvas.width === 0 || frame.canvas.height === 0;
}

function createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
