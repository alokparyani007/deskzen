import { computeBaseline } from './baseline';
import { postureConfig } from './config';
import { medianBaselines } from './glow';
import { frameSignals } from './signals';
import type { Baseline, Landmarks, NormPoint } from './types';

export interface GlowUpStat {
  id: 'taller' | 'back' | 'distance';
  text: string;
}

export interface SetupItem {
  id: 'height' | 'distance' | 'light' | 'framing';
  ok: boolean;
  label: string;
  fix: string | null;
}

export function blendBaseline(current: Baseline, incoming: Baseline, keep = postureConfig.glow.blendKeep): Baseline {
  const next = 1 - keep;
  const mix = (older: number, newer: number) => older * keep + newer * next;
  const point = (older: NormPoint, newer: NormPoint): NormPoint => ({ x: mix(older.x, newer.x), y: mix(older.y, newer.y) });
  const optional = (older: NormPoint | undefined, newer: NormPoint | undefined): NormPoint | undefined => {
    if (older && newer) return point(older, newer);
    return older ?? newer;
  };
  return {
    ...current,
    createdAt: new Date().toISOString(),
    ipdPx: mix(current.ipdPx, incoming.ipdPx),
    headDropNorm: mix(current.headDropNorm, incoming.headDropNorm),
    shrugNorm: mix(current.shrugNorm, incoming.shrugNorm),
    roundNorm: mix(current.roundNorm, incoming.roundNorm),
    shoulderAngleDeg: mix(current.shoulderAngleDeg, incoming.shoulderAngleDeg),
    eyeAngleDeg: mix(current.eyeAngleDeg, incoming.eyeAngleDeg),
    shoulderWidthPx: mix(current.shoulderWidthPx, incoming.shoulderWidthPx),
    focalPx: mix(current.focalPx, incoming.focalPx),
    screenDistanceIn: mix(current.screenDistanceIn, incoming.screenDistanceIn),
    nose: point(current.nose, incoming.nose),
    leftEye: point(current.leftEye, incoming.leftEye),
    rightEye: point(current.rightEye, incoming.rightEye),
    leftEar: optional(current.leftEar, incoming.leftEar),
    rightEar: optional(current.rightEar, incoming.rightEar),
    leftShoulder: point(current.leftShoulder, incoming.leftShoulder),
    rightShoulder: point(current.rightShoulder, incoming.rightShoulder),
    elbowAngleDeg:
      current.elbowAngleDeg !== undefined && incoming.elbowAngleDeg !== undefined
        ? mix(current.elbowAngleDeg, incoming.elbowAngleDeg)
        : current.elbowAngleDeg ?? incoming.elbowAngleDeg,
  };
}

/** One relaxed frame, used only for the Before outline. Not the saved baseline. */
export function frameSnapshot(sample: Landmarks): Baseline | null {
  if (sample.videoWidth <= 0 || sample.videoHeight <= 0) return null;
  if (!sample.nose || !sample.leftEye || !sample.rightEye || !sample.leftShoulder || !sample.rightShoulder) return null;
  const signals = frameSignals(sample);
  if (!(signals.ipdPx && signals.ipdPx > 0)) return null;
  const width = sample.videoWidth;
  const height = sample.videoHeight;
  const point = (value: { x: number; y: number }): NormPoint => ({ x: value.x / width, y: value.y / height });
  return {
    version: 1,
    createdAt: new Date(0).toISOString(),
    ipdPx: signals.ipdPx,
    headDropNorm: signals.headDropNorm ?? 0,
    shrugNorm: signals.shrugNorm ?? 0,
    roundNorm: signals.roundNorm ?? 0,
    shoulderAngleDeg: signals.shoulderAngleDeg ?? 0,
    eyeAngleDeg: signals.eyeAngleDeg ?? 0,
    shoulderWidthPx: signals.shoulderWidthPx ?? 0,
    focalPx: signals.focalPx,
    screenDistanceIn: signals.screenDistanceIn ?? 0,
    videoWidth: width,
    videoHeight: height,
    nose: point(sample.nose),
    leftEye: point(sample.leftEye),
    rightEye: point(sample.rightEye),
    leftEar: sample.leftEar ? point(sample.leftEar) : undefined,
    rightEar: sample.rightEar ? point(sample.rightEar) : undefined,
    leftShoulder: point(sample.leftShoulder),
    rightShoulder: point(sample.rightShoulder),
  };
}

/** Median of the hold. Splits into three stills when there are enough frames. */
export function medianCapture(frames: Landmarks[]): Baseline | null {
  const { minSamples } = postureConfig.calibration;
  if (frames.length >= minSamples * 3) {
    const size = Math.floor(frames.length / 3);
    const parts = [frames.slice(0, size), frames.slice(size, size * 2), frames.slice(size * 2)];
    const samples = parts.map((part) => computeBaseline(part));
    if (samples.every((item) => item.ok)) {
      return medianBaselines(samples.flatMap((item) => (item.ok ? [item.baseline] : [])));
    }
  }
  if (frames.length < minSamples) return null;
  const single = computeBaseline(frames);
  return single.ok ? single.baseline : null;
}

export function glowUpStats(before: Baseline, glow: Baseline): GlowUpStat[] {
  const stats: GlowUpStat[] = [];
  const scale = inchesPerPx(glow.ipdPx, glow.videoWidth);
  if (scale && glow.videoHeight > 0) {
    const taller = (before.nose.y - glow.nose.y) * glow.videoHeight * scale;
    if (taller >= postureConfig.glow.minStatIn) stats.push({ id: 'taller', text: `About ${taller.toFixed(1)} in taller` });
  }
  if (glow.ipdPx > ipdFloor(glow.videoWidth)) {
    const back = ((glow.headDropNorm - before.headDropNorm) * postureConfig.typicalIpdMm) / 25.4;
    if (back >= postureConfig.glow.minStatIn) stats.push({ id: 'back', text: `Head ${back.toFixed(1)} in further back` });
  }
  if (glow.screenDistanceIn >= 12 && glow.screenDistanceIn <= 48) {
    stats.push({ id: 'distance', text: `Screen distance ${Math.round(glow.screenDistanceIn)} in` });
  }
  return stats;
}

export function setupScore(input: {
  eyeY: number | null;
  distanceIn: number | null;
  lightOk: boolean;
  framed: boolean;
}): SetupItem[] {
  const { eyeLineYRatio, lineToleranceRatio, distanceMinIn, distanceMaxIn } = postureConfig.calibration;
  const heightOk = input.eyeY !== null && Math.abs(input.eyeY - eyeLineYRatio) <= lineToleranceRatio;
  let heightFix: string | null = null;
  if (!heightOk && input.eyeY !== null && input.eyeY > eyeLineYRatio) heightFix = 'Raise your screen about 2 in';
  if (!heightOk && input.eyeY !== null && input.eyeY < eyeLineYRatio) heightFix = 'Lower your screen a little';
  if (!heightOk && input.eyeY === null) heightFix = 'Raise your screen about 2 in';

  const distanceOk = input.distanceIn !== null && input.distanceIn >= distanceMinIn && input.distanceIn <= distanceMaxIn;
  let distanceFix: string | null = null;
  if (!distanceOk && input.distanceIn !== null && input.distanceIn < distanceMinIn) distanceFix = 'Scoot back a little';
  if (!distanceOk && (input.distanceIn === null || input.distanceIn > distanceMaxIn)) distanceFix = 'Come a bit closer';

  return [
    { id: 'height', ok: heightOk, label: 'Screen height', fix: heightOk ? null : heightFix },
    { id: 'distance', ok: distanceOk, label: 'Screen distance', fix: distanceOk ? null : distanceFix },
    { id: 'light', ok: input.lightOk, label: 'Light', fix: input.lightOk ? null : 'Add light in front of you' },
    { id: 'framing', ok: input.framed, label: 'Camera framing', fix: input.framed ? null : 'Step into the center of the frame' },
  ];
}

function inchesPerPx(ipdPx: number, videoWidth = 0): number | null {
  if (!(ipdPx > ipdFloor(videoWidth))) return null;
  return postureConfig.typicalIpdMm / ipdPx / 25.4;
}

function ipdFloor(videoWidth: number): number {
  return videoWidth > 0 ? (videoWidth * 20) / 640 : 20;
}
