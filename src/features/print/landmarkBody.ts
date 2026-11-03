import type { Point } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';

/**
 * Head, neck, shoulders, and upper arms in video pixels, with a flat desk cut.
 * Used when a traced silhouette is not available. Numbers only.
 */
export function landmarkBodyPoints(frame: Landmarks): Point[] | null {
  const left = frame.leftShoulder;
  const right = frame.rightShoulder;
  if (!left || !right || frame.videoWidth <= 0 || frame.videoHeight <= 0) return null;
  const span = Math.hypot(right.x - left.x, right.y - left.y);
  if (span < 8) return null;
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;
  const eyeX = frame.leftEye && frame.rightEye ? (frame.leftEye.x + frame.rightEye.x) / 2 : (frame.nose?.x ?? midX);
  const eyeY = frame.leftEye && frame.rightEye ? (frame.leftEye.y + frame.rightEye.y) / 2 : (frame.nose?.y ?? midY - span * 0.9);
  const faceW = frame.leftFace && frame.rightFace ? Math.abs(frame.rightFace.x - frame.leftFace.x) : span * 0.42;
  const topY = frame.headTop?.y ?? eyeY - faceW * 0.7;
  const chinY = frame.chin?.y ?? eyeY + faceW * 0.55;
  const cx = frame.nose?.x ?? eyeX;
  const cy = (topY + chinY) / 2;
  const rx = Math.max(faceW / 2, span * 0.18);
  const ry = Math.max(Math.abs(chinY - topY) / 2, span * 0.22);
  const leftElbow = frame.leftElbow ?? { x: left.x - span * 0.22, y: left.y + span * 0.55 };
  const rightElbow = frame.rightElbow ?? { x: right.x + span * 0.22, y: right.y + span * 0.55 };
  const deskY = Math.min(frame.videoHeight * 0.92, Math.max(leftElbow.y, rightElbow.y, midY + span * 0.85));
  const neckY = (Math.max(chinY, cy + ry) + midY) / 2;
  const crown: Point[] = [];
  const steps = 10;
  for (let index = 0; index <= steps; index += 1) {
    const theta = Math.PI + (Math.PI * index) / steps;
    crown.push({ x: cx + rx * Math.cos(theta), y: cy + ry * Math.sin(theta) });
  }
  return [
    { x: leftElbow.x, y: deskY },
    { x: leftElbow.x, y: Math.min(leftElbow.y, deskY) },
    { x: left.x, y: left.y },
    { x: midX - span * 0.08, y: neckY },
    ...crown,
    { x: midX + span * 0.08, y: neckY },
    { x: right.x, y: right.y },
    { x: rightElbow.x, y: Math.min(rightElbow.y, deskY) },
    { x: rightElbow.x, y: deskY },
  ];
}
