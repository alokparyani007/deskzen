import type { LightSample } from '../../calibration/setupCheck';
import type { Landmarks } from '../../lib/posture/types';

const WIDTH = 64;
const HEIGHT = 48;

/**
 * Face and background brightness from one downscaled frame.
 * The canvas is discarded. Nothing is saved or sent.
 */
export function readLight(video: HTMLVideoElement | null, landmarks: Landmarks | null): LightSample | undefined {
  const box = landmarks?.faceBox;
  if (!video || video.readyState < 2 || video.videoWidth === 0 || !box || box.w <= 0 || box.h <= 0) return undefined;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;

  ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
  const frame = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  const faceX = box.x * WIDTH;
  const faceY = box.y * HEIGHT;
  const faceW = box.w * WIDTH;
  const faceH = box.h * HEIGHT;
  let backgroundSum = 0;
  let backgroundCount = 0;
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (x >= faceX && x < faceX + faceW && y >= faceY && y < faceY + faceH) continue;
      const index = (y * WIDTH + x) * 4;
      backgroundSum += (frame[index]! + frame[index + 1]! + frame[index + 2]!) / 3;
      backgroundCount += 1;
    }
  }

  ctx.drawImage(video, box.x * video.videoWidth, box.y * video.videoHeight, box.w * video.videoWidth, box.h * video.videoHeight, 0, 0, WIDTH, HEIGHT);
  const face = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  let faceSum = 0;
  const faceCount = face.length / 4;
  for (let index = 0; index < face.length; index += 4) {
    faceSum += (face[index]! + face[index + 1]! + face[index + 2]!) / 3;
  }
  if (faceCount === 0 || backgroundCount === 0) return undefined;
  return { face: faceSum / faceCount / 255, background: backgroundSum / backgroundCount / 255 };
}
