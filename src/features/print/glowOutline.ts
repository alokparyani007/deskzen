import { median } from '../../lib/posture/baseline';
import type { Landmarks } from '../../lib/posture/types';

export interface GlowPoint {
  x: number;
  y: number;
}

/** Head, neck, shoulders and upper torso, in normalized frame space. Landmarks only. */
export interface GlowOutline {
  head: { cx: number; cy: number; rx: number; ry: number };
  neck: GlowPoint;
  leftShoulder: GlowPoint;
  rightShoulder: GlowPoint;
  torso: GlowPoint;
}

export function outlineFromFrames(frames: Landmarks[]): GlowOutline | null {
  const usable = frames.filter((frame) => frame.videoWidth > 0 && frame.videoHeight > 0 && frame.leftShoulder && frame.rightShoulder);
  if (usable.length === 0) return null;
  const sample = usable[0]!;
  const px = (pick: (frame: Landmarks) => number | undefined) => {
    const values = usable.map(pick).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length === 0 ? undefined : median(values);
  };
  const width = sample.videoWidth;
  const height = sample.videoHeight;
  const leftX = px((frame) => frame.leftShoulder?.x);
  const leftY = px((frame) => frame.leftShoulder?.y);
  const rightX = px((frame) => frame.rightShoulder?.x);
  const rightY = px((frame) => frame.rightShoulder?.y);
  if (leftX === undefined || leftY === undefined || rightX === undefined || rightY === undefined) return null;
  const box = usable.map((frame) => frame.faceBox).find((item) => item && item.w > 0 && item.h > 0);
  const eyeX = px((frame) => (frame.leftEye && frame.rightEye ? (frame.leftEye.x + frame.rightEye.x) / 2 : frame.nose?.x));
  const eyeY = px((frame) => (frame.leftEye && frame.rightEye ? (frame.leftEye.y + frame.rightEye.y) / 2 : frame.nose?.y));
  const headW = box ? box.w : 0.16;
  const headH = box ? box.h : 0.22;
  const cx = box ? box.x + box.w / 2 : (eyeX ?? width / 2) / width;
  const cy = box ? box.y + box.h / 2 : (eyeY ?? height * 0.3) / height;
  const left = { x: leftX / width, y: leftY / height };
  const right = { x: rightX / width, y: rightY / height };
  const neck = { x: (left.x + right.x) / 2, y: (cy + (left.y + right.y) / 2) / 2 };
  return {
    head: { cx, cy, rx: headW / 2, ry: headH / 2 },
    neck,
    leftShoulder: left,
    rightShoulder: right,
    torso: { x: neck.x, y: Math.min(0.98, neck.y + 0.18) },
  };
}
