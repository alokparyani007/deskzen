import type { Landmark, Landmarks, NormPoint } from '../lib/posture/types';

/** Mirrored, normalized lock pose. Numbers only. Never an image. */
export interface LockedPose {
  nose: NormPoint;
  leftEye: NormPoint;
  rightEye: NormPoint;
  leftEar?: NormPoint;
  rightEar?: NormPoint;
  chin?: NormPoint;
  headTop?: NormPoint;
  leftFace?: NormPoint;
  rightFace?: NormPoint;
  leftShoulder: NormPoint;
  rightShoulder: NormPoint;
  faceWidth: number;
  videoWidth: number;
  videoHeight: number;
}

export type DriftKind = 'head' | 'shoulders' | 'lean';

export function lockedPoseFromFrames(frames: readonly Landmarks[]): LockedPose | null {
  const usable = frames.filter((frame) => frame.nose && frame.leftEye && frame.rightEye && frame.leftShoulder && frame.rightShoulder && frame.videoWidth > 0);
  if (usable.length === 0) return null;
  const sample = usable[0]!;
  const point = (read: (frame: Landmarks) => Landmark | undefined): NormPoint | undefined => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const frame of usable) {
      const value = read(frame);
      if (!value || frame.videoWidth <= 0 || frame.videoHeight <= 0) continue;
      xs.push(1 - value.x / frame.videoWidth);
      ys.push(value.y / frame.videoHeight);
    }
    if (xs.length === 0) return undefined;
    return { x: median(xs), y: median(ys) };
  };
  const nose = point((frame) => frame.nose);
  const leftEye = point((frame) => frame.leftEye);
  const rightEye = point((frame) => frame.rightEye);
  const leftShoulder = point((frame) => frame.leftShoulder);
  const rightShoulder = point((frame) => frame.rightShoulder);
  if (!nose || !leftEye || !rightEye || !leftShoulder || !rightShoulder) return null;
  const widths = usable.map((frame) => frame.faceBox?.w).filter((value): value is number => typeof value === 'number' && value > 0);
  return {
    nose,
    leftEye,
    rightEye,
    leftEar: point((frame) => frame.leftEar),
    rightEar: point((frame) => frame.rightEar),
    chin: point((frame) => frame.chin),
    headTop: point((frame) => frame.headTop),
    leftFace: point((frame) => frame.leftFace),
    rightFace: point((frame) => frame.rightFace),
    leftShoulder,
    rightShoulder,
    faceWidth: widths.length > 0 ? median(widths) : Math.abs(rightEye.x - leftEye.x) * 2.2,
    videoWidth: sample.videoWidth,
    videoHeight: sample.videoHeight,
  };
}

/** Scale around the shoulder midpoint when the camera distance changed by more than 15%. */
export function fitLockedPose(pose: LockedPose, faceWidth: number): { pose: LockedPose; moved: boolean } {
  if (pose.faceWidth <= 0 || faceWidth <= 0) return { pose, moved: false };
  const ratio = faceWidth / pose.faceWidth;
  if (Math.abs(ratio - 1) <= 0.15) return { pose, moved: false };
  const mid = { x: (pose.leftShoulder.x + pose.rightShoulder.x) / 2, y: (pose.leftShoulder.y + pose.rightShoulder.y) / 2 };
  const scale = (point: NormPoint | undefined) => (point ? { x: mid.x + (point.x - mid.x) * ratio, y: mid.y + (point.y - mid.y) * ratio } : undefined);
  return {
    moved: true,
    pose: {
      ...pose,
      nose: scale(pose.nose)!,
      leftEye: scale(pose.leftEye)!,
      rightEye: scale(pose.rightEye)!,
      leftEar: scale(pose.leftEar),
      rightEar: scale(pose.rightEar),
      chin: scale(pose.chin),
      headTop: scale(pose.headTop),
      leftFace: scale(pose.leftFace),
      rightFace: scale(pose.rightFace),
      leftShoulder: scale(pose.leftShoulder)!,
      rightShoulder: scale(pose.rightShoulder)!,
      faceWidth,
    },
  };
}

export function headEllipse(pose: LockedPose): { cx: number; cy: number; rx: number; ry: number } {
  const top = pose.headTop ?? { x: pose.nose.x, y: Math.min(pose.leftEye.y, pose.rightEye.y) - 0.08 };
  const chin = pose.chin ?? { x: pose.nose.x, y: pose.nose.y + 0.06 };
  const left = pose.leftFace ?? pose.leftEye;
  const right = pose.rightFace ?? pose.rightEye;
  return {
    cx: (left.x + right.x) / 2,
    cy: (top.y + chin.y) / 2,
    rx: Math.max(0.02, Math.abs(right.x - left.x) / 2),
    ry: Math.max(0.02, Math.abs(chin.y - top.y) / 2),
  };
}

/** SVG path in the same 0–1 space as the saved points. */
export function outlinePath(pose: LockedPose): string {
  const head = headEllipse(pose);
  const neckY = Math.max(pose.leftEar?.y ?? head.cy + head.ry, pose.rightEar?.y ?? head.cy + head.ry);
  const midX = (pose.leftShoulder.x + pose.rightShoulder.x) / 2;
  const n = (value: number) => value.toFixed(4);
  return [
    `M ${n(head.cx - head.rx)} ${n(head.cy)}`,
    `A ${n(head.rx)} ${n(head.ry)} 0 1 1 ${n(head.cx + head.rx)} ${n(head.cy)}`,
    `M ${n(midX)} ${n(neckY)}`,
    `L ${n(pose.leftShoulder.x)} ${n(pose.leftShoulder.y)}`,
    `L ${n(pose.rightShoulder.x)} ${n(pose.rightShoulder.y)}`,
  ].join(' ');
}

export function pathNear(path: string, point: NormPoint, tolerance = 0.02): boolean {
  const numbers = path.match(/-?\d+\.\d+/g)?.map(Number) ?? [];
  for (let index = 0; index < numbers.length - 1; index += 1) {
    const x = numbers[index]!;
    const y = numbers[index + 1]!;
    if (Math.abs(x - point.x) <= tolerance && Math.abs(y - point.y) <= tolerance) return true;
  }
  return false;
}

export function liveFromPrint(amount: number): { score: number; drifting: boolean; label: 'Drifting' | 'Great posture' } {
  const drifting = amount >= 1;
  const score = Math.max(0, Math.min(100, Math.round(100 - amount * 15)));
  return { score, drifting, label: drifting ? 'Drifting' : 'Great posture' };
}

export function driftKind(deltas: { head: number; shoulders: number; lean: number }): DriftKind | null {
  const ranked = [
    { kind: 'head' as const, value: deltas.head },
    { kind: 'shoulders' as const, value: deltas.shoulders },
    { kind: 'lean' as const, value: deltas.lean },
  ].sort((a, b) => b.value - a.value);
  if ((ranked[0]?.value ?? 0) < 1) return null;
  return ranked[0]!.kind;
}

export function driftCopy(kind: DriftKind | null, back: boolean): string | null {
  if (back) return 'Back in your outline';
  if (kind === 'head') return 'Head drifting forward. Glide back into your outline.';
  if (kind === 'shoulders') return 'Shoulders creeping up. Let them drop.';
  if (kind === 'lean') return 'Leaning to one side. Center yourself.';
  return null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}
