/** VGA frame the first thresholds were tuned on. Same pose at 1280 maps back to this. */
export const VGA_WIDTH = 640;
export const VGA_HEIGHT = 480;

/** Horizontal field size, so a pixel length means the same fraction of the frame at any resolution. */
export function lengthRatio(currentPx: number, currentSpan: number, baselinePx: number, baselineSpan: number): number {
  if (!(baselinePx > 0)) return 0;
  if (!(currentSpan > 0) || !(baselineSpan > 0)) return currentPx / baselinePx;
  return currentPx / currentSpan / (baselinePx / baselineSpan);
}

/** Saved focal length, scaled when the camera width changes. Same width leaves it untouched. */
export function focalFor(
  frame: { videoWidth: number },
  baseline: { focalPx: number; videoWidth: number },
): number {
  if (!(baseline.videoWidth > 0) || !(frame.videoWidth > 0)) return baseline.focalPx;
  return baseline.focalPx * (frame.videoWidth / baseline.videoWidth);
}

/** Width/height. A vertical-over-horizontal norm times this matches across 4:3 and 16:9. */
export function aspectFactor(width: number, height: number): number {
  if (!(height > 0)) return 1;
  return width / height;
}

/** Pixel delta as it would measure on a 640x480 frame. Identical on that frame. */
export function vgaPixels(dx: number, dy: number, videoWidth: number, videoHeight: number): number {
  const width = videoWidth > 0 ? videoWidth : VGA_WIDTH;
  const height = videoHeight > 0 ? videoHeight : VGA_HEIGHT;
  return Math.hypot((dx / width) * VGA_WIDTH, (dy / height) * VGA_HEIGHT);
}
