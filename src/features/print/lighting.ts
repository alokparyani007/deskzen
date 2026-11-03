export interface LightingRead {
  great: boolean;
  text: string;
}

/** Average luminance plus center-versus-edge contrast. Pixels are not kept. */
export function lightingLabel(average: number, center: number, edge: number): LightingRead {
  if (edge - center > 0.18 && center < average) {
    return { great: false, text: 'Backlit - try turning so the light is in front of you' };
  }
  if (average < 0.32) {
    return { great: false, text: 'A bit dark - face a window or turn on a light' };
  }
  return { great: true, text: 'Lighting: great' };
}

const WIDTH = 32;
const HEIGHT = 18;

/** One 32x18 sample. The canvas is discarded. Nothing is saved or sent. */
export function measureLighting(video: HTMLVideoElement | null): LightingRead | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
  const frame = ctx.getImageData(0, 0, WIDTH, HEIGHT).data;
  let sum = 0;
  let center = 0;
  let centerCount = 0;
  let edge = 0;
  let edgeCount = 0;
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const index = (y * WIDTH + x) * 4;
      const luma = (0.2126 * frame[index]! + 0.7152 * frame[index + 1]! + 0.0722 * frame[index + 2]!) / 255;
      sum += luma;
      const inCenter = x >= 8 && x < 24 && y >= 4 && y < 14;
      if (inCenter) {
        center += luma;
        centerCount += 1;
      } else {
        edge += luma;
        edgeCount += 1;
      }
    }
  }
  if (centerCount === 0 || edgeCount === 0) return null;
  return lightingLabel(sum / (WIDTH * HEIGHT), center / centerCount, edge / edgeCount);
}
