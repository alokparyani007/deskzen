export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Map a video pixel into the mirrored object-cover preview.
 * The result is 0..1 across the visible frame. x is mirrored to match the camera.
 */
/**
 * Video pixel to the mirrored object-cover preview, in view pixels.
 * Every overlay uses this so cover crop and the camera mirror stay in one place.
 */
export function videoToScreen(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number,
): ScreenPoint {
  const videoW = Math.max(1, videoWidth);
  const videoH = Math.max(1, videoHeight);
  const viewW = Math.max(1, viewWidth);
  const viewH = Math.max(1, viewHeight);
  const scale = Math.max(viewW / videoW, viewH / videoH);
  const offsetX = (viewW - videoW * scale) / 2;
  const offsetY = (viewH - videoH * scale) / 2;
  return { x: viewW - (offsetX + x * scale), y: offsetY + y * scale };
}

/** Same mapping as videoToScreen, as a 0..1 fraction of the view. */
export function toScreen(
  x: number,
  y: number,
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number,
): ScreenPoint {
  const viewW = Math.max(1, viewWidth);
  const viewH = Math.max(1, viewHeight);
  const point = videoToScreen(x, y, videoWidth, videoHeight, viewW, viewH);
  return { x: point.x / viewW, y: point.y / viewH };
}

/** object-position that keeps the head, both shoulders, and a little torso in frame. */
export function shoulderObjectPosition(frame: { leftShoulder?: { y: number }; rightShoulder?: { y: number }; videoHeight: number } | null): string {
  if (!frame?.leftShoulder || !frame.rightShoulder || frame.videoHeight <= 0) return 'center 42%';
  const shoulder = ((frame.leftShoulder.y + frame.rightShoulder.y) / 2) / frame.videoHeight;
  const focus = Math.min(0.72, Math.max(0.36, shoulder - 0.12));
  return `center ${Math.round(focus * 100)}%`;
}

/** Closed SVG path in the same 0..1 space as toScreen. */
export function screenPath(
  points: readonly { x: number; y: number }[],
  videoWidth: number,
  videoHeight: number,
  viewWidth: number,
  viewHeight: number,
  close = true,
): string {
  if (points.length < 3) return '';
  const commands = points.map((point, index) => {
    const placed = toScreen(point.x, point.y, videoWidth, videoHeight, viewWidth, viewHeight);
    return `${index === 0 ? 'M' : 'L'} ${placed.x.toFixed(4)} ${placed.y.toFixed(4)}`;
  });
  return close ? `${commands.join(' ')} Z` : commands.join(' ');
}
