import type { Landmarks } from '../../lib/posture/types';

/** Shoulder curve and neck line in video pixels. Lift scales with shoulder width. */
export function bodyOutlineParts(landmarks: Landmarks | null): { shoulder: { x: number; y: number }[]; neck: { x: number; y: number }[] } {
  const left = landmarks?.leftShoulder;
  const right = landmarks?.rightShoulder;
  if (!left || !right) return { shoulder: [], neck: [] };
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;
  const span = Math.abs(right.x - left.x);
  const lift = Math.max(span * 0.04, span * 0.12);
  const noseY = landmarks?.nose?.y;
  const neckY = noseY === undefined ? midY - lift : midY + (noseY - midY) * 0.35;
  return {
    shoulder: quad(left, { x: midX, y: midY - lift }, right, 14),
    neck: quad({ x: midX, y: midY }, { x: midX, y: (midY + neckY) / 2 }, { x: midX, y: neckY }, 8),
  };
}

export function bodyOutlinePoints(landmarks: Landmarks | null): { x: number; y: number }[] {
  const parts = bodyOutlineParts(landmarks);
  return [...parts.shoulder, ...parts.neck];
}

function quad(
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  steps: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const u = 1 - t;
    points.push({
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
    });
  }
  return points;
}
