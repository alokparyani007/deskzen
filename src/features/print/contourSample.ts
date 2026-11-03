import type { Landmarks } from '../../lib/posture/types';
import {
  alignContour,
  averageMasks,
  cleanPersonGrid,
  levelShoulderLine,
  medianContour,
  normalizeContour,
  outlineIsSane,
  scaleToVideo,
  silhouetteIsUsable,
  smoothContour,
  traceBinary,
  traceMask,
  type MaskGrid,
  type Point,
  type Silhouette,
  type SilhouetteAnchors,
} from '../../lib/posture/silhouette';

export function anchorsFromLandmarks(frame: Landmarks): SilhouetteAnchors | null {
  const left = frame.leftShoulder;
  const right = frame.rightShoulder;
  if (!left || !right) return null;
  const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y);
  if (shoulderWidth < 8) return null;
  const eyeAngle = frame.leftEye && frame.rightEye ? Math.atan2(frame.rightEye.y - frame.leftEye.y, frame.rightEye.x - frame.leftEye.x) : 0;
  return {
    shoulderX: (left.x + right.x) / 2,
    shoulderY: (left.y + right.y) / 2,
    shoulderWidth,
    eyeY: frame.leftEye && frame.rightEye ? (frame.leftEye.y + frame.rightEye.y) / 2 : left.y,
    eyeAngle,
    deskY: frame.videoHeight * 0.92,
  };
}

export function silhouetteFromContours(contours: Point[][], anchors: SilhouetteAnchors, lean: number, accuracy: number): Silhouette | null {
  const points = medianContour(contours);
  if (points.length < 3) return null;
  return { points, anchors, capturedAt: new Date().toISOString(), accuracy, lean };
}

/** Video-pixel outline plus the normalized points saved on the print. Rejects a background trace. */
export async function sampleContour(video: HTMLVideoElement, frame: Landmarks | null): Promise<{ pixels: Point[]; normalized: Point[] } | null> {
  if (!frame) return null;
  const anchors = anchorsFromLandmarks(frame);
  if (!anchors) return null;
  const probes = [
    frame.nose ? { x: frame.nose.x, y: frame.nose.y } : null,
    { x: anchors.shoulderX, y: anchors.shoulderY },
  ].filter((point): point is Point => point !== null);
  const { readPersonMask } = await import('../../lib/vision/segment');
  const mask = await readPersonMask(video, frame.timestampMs, probes);
  if (!mask) return null;
  const traced = traceMask(mask, anchors, { videoWidth: frame.videoWidth, videoHeight: frame.videoHeight, probes });
  if (traced.length < 8) return null;
  const pixels = alignContour(traced);
  const normalized = normalizeContour(pixels, anchors);
  const shape = { points: normalized, anchors, capturedAt: '', accuracy: 100, lean: 0 };
  return silhouetteIsUsable(shape) ? { pixels, normalized } : null;
}

/**
 * Average the hold, keep the person, cut the chair, and level a tiny tilt.
 * A trace that fails the sanity check is discarded so the preview can use landmarks.
 */
export function outlineFromMasks(samples: MaskGrid[], frame: Landmarks | null): { silhouette: Silhouette | null; fallback: boolean } {
  const averaged = averageMasks(samples);
  const anchors = frame ? anchorsFromLandmarks(frame) : null;
  if (!averaged || !frame || !anchors || !frame.nose || !frame.leftShoulder || !frame.rightShoulder || frame.videoWidth <= 0) {
    return { silhouette: null, fallback: true };
  }
  const toMask = (point: Point): Point => ({
    x: (point.x * averaged.width) / frame.videoWidth,
    y: (point.y * averaged.height) / frame.videoHeight,
  });
  const grid = cleanPersonGrid(averaged.values, averaged.width, averaged.height, {
    nose: toMask(frame.nose),
    left: toMask(frame.leftShoulder),
    right: toMask(frame.rightShoulder),
    face: faceEllipse(frame, averaged.width, averaged.height),
  });
  if (!grid) return { silhouette: null, fallback: true };
  const traced = scaleToVideo(traceBinary(grid, averaged.width, averaged.height), averaged.width, averaged.height, frame.videoWidth, frame.videoHeight);
  if (traced.length < 8) return { silhouette: null, fallback: true };
  const leveled = levelShoulderLine(traced, frame.leftShoulder, frame.rightShoulder);
  const smooth = smoothContour(leveled.points);
  if (!outlineIsSane(smooth, anchors.shoulderX, anchors.shoulderWidth)) return { silhouette: null, fallback: true };
  const stored = { ...anchors, eyeAngle: 0 };
  const points = normalizeContour(smooth, stored);
  const shape: Silhouette = {
    points,
    anchors: stored,
    capturedAt: new Date().toISOString(),
    accuracy: 80,
    lean: leveled.leveled ? 0 : 1,
  };
  return silhouetteIsUsable(shape) ? { silhouette: shape, fallback: false } : { silhouette: null, fallback: true };
}

function faceEllipse(frame: Landmarks, maskWidth: number, maskHeight: number): { cx: number; cy: number; rx: number; ry: number } | null {
  const box = frame.faceBox;
  if (box && box.w > 0 && box.h > 0) {
    const x = box.x * maskWidth;
    const y = box.y * maskHeight;
    const w = box.w * maskWidth;
    const h = box.h * maskHeight;
    const rx = (w * 1.25) / 2;
    const ry = (h * 1.4) / 2;
    const top = y - h * 0.35;
    return { cx: x + w / 2, cy: top + ry, rx, ry };
  }
  if (!frame.leftEye || !frame.rightEye || frame.videoWidth <= 0) return null;
  const cx = ((frame.leftEye.x + frame.rightEye.x) / 2) * (maskWidth / frame.videoWidth);
  const eyeY = ((frame.leftEye.y + frame.rightEye.y) / 2) * (maskHeight / frame.videoHeight);
  const w = Math.abs(frame.rightEye.x - frame.leftEye.x) * 2.4 * (maskWidth / frame.videoWidth);
  const h = w * 1.35;
  const rx = (w * 1.25) / 2;
  const ry = (h * 1.4) / 2;
  return { cx, cy: eyeY - h * 0.45 + ry, rx, ry };
}

export async function contourFromFrame(video: HTMLVideoElement, frame: Landmarks | null): Promise<Point[] | null> {
  const sample = await sampleContour(video, frame);
  return sample?.normalized ?? null;
}
