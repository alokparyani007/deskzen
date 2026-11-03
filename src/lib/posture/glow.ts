import { median } from './baseline';
import { postureConfig } from './config';
import type { Alignment, Baseline, GuideId, Landmarks, NormPoint } from './types';

export interface GuideFill {
  head: boolean;
  shoulders: boolean;
  distance: boolean;
  light: boolean;
}

export interface GlowStats {
  distance: string;
  head: string;
  shoulders: string;
}

export interface GlowAttempt {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  ok: boolean;
  pose: 'sit' | 'stand';
  retries?: number;
}

export function glowSamples(pose: 'sit' | 'stand'): readonly string[] {
  return pose === 'stand' ? ['Stand tall', 'Weight on both feet', 'Look at the screen'] : ['Sit tall', 'Sit relaxed', 'Look at the screen'];
}

export function glowCue(alignment: Alignment | null, lightIsOk: boolean): string {
  if (!lightIsOk) return 'A little more light would help';
  if (!alignment || !flag(alignment, 'center')) return 'Step into the outline';
  const inches = alignment.distanceIn;
  const { distanceMinIn, distanceMaxIn } = postureConfig.calibration;
  if (inches !== null && inches < distanceMinIn) return 'Scoot back a little';
  if (inches !== null && inches > distanceMaxIn) return 'Come a bit closer';
  if (!flag(alignment, 'distance')) return 'Step into the outline';
  if (!flag(alignment, 'eyes') || !flag(alignment, 'headStack')) return 'Chin slightly down';
  if (!flag(alignment, 'shoulders')) return 'Relax your shoulders';
  return 'Nice, hold it';
}

export function glowFill(alignment: Alignment | null, lightIsOk: boolean): GuideFill {
  return {
    head: flag(alignment, 'center') && flag(alignment, 'headStack'),
    shoulders: flag(alignment, 'shoulders'),
    distance: flag(alignment, 'distance'),
    light: lightIsOk,
  };
}

export function lightIsOk(landmarks: Landmarks | null): boolean {
  if (!landmarks) return true;
  const watched = [landmarks.nose, landmarks.leftEye, landmarks.rightEye, landmarks.leftShoulder, landmarks.rightShoulder].filter(
    (point): point is NonNullable<typeof point> => Boolean(point),
  );
  if (watched.length === 0) return true;
  return watched.every((point) => point.visibility === undefined || point.visibility >= postureConfig.minVisibility);
}

/** True when the face is more than 15% larger or smaller than the saved baseline. Widths keep 720p equal to VGA. */
export function setupChanged(
  baselineIpd: number,
  currentIpd: number,
  ratio: number = postureConfig.calibration.setupShiftRatio,
  baselineWidth = 0,
  currentWidth = 0,
): boolean {
  if (!(baselineIpd > 0) || !(currentIpd > 0)) return false;
  const scale = baselineWidth > 0 && currentWidth > 0 ? currentIpd / currentWidth / (baselineIpd / baselineWidth) : currentIpd / baselineIpd;
  return Math.abs(scale - 1) > ratio;
}

/** Face scale shifted, or the camera angle changed while the face stayed about the same size. */
export function setupViewChanged(
  baseline: Baseline,
  current: { ipdPx?: number; shoulderAngleDeg?: number; noseY?: number; videoWidth?: number },
): boolean {
  const width = current.videoWidth ?? 0;
  if (current.ipdPx !== undefined && setupChanged(baseline.ipdPx, current.ipdPx, postureConfig.calibration.setupShiftRatio, baseline.videoWidth, width)) return true;
  const scaleMoving = current.ipdPx !== undefined && setupChanged(baseline.ipdPx, current.ipdPx, 0.08, baseline.videoWidth, width);
  if (scaleMoving) return false;
  const tilted =
    current.shoulderAngleDeg !== undefined &&
    Math.abs(current.shoulderAngleDeg - baseline.shoulderAngleDeg) >= postureConfig.glow.angleDeg;
  const pitched = current.noseY !== undefined && Math.abs(current.noseY - baseline.nose.y) >= postureConfig.glow.pitchRatio;
  return tilted || pitched;
}

export function glowCheckDue(lastDay: string | null, today: string): boolean {
  return lastDay !== today;
}

export function glowStats(baseline: Baseline): GlowStats {
  const inches = Math.round(baseline.screenDistanceIn);
  const head = Math.abs(baseline.eyeAngleDeg) <= postureConfig.calibration.eyeLevelMaxDeg ? 'Level with the screen' : 'A slight tilt, saved as your line';
  const shoulders = Math.abs(baseline.shoulderAngleDeg) <= postureConfig.calibration.shoulderLevelMaxDeg ? 'Even across' : 'A little uneven, saved as your line';
  return {
    distance: `about ${inches} in`,
    head,
    shoulders,
  };
}

/** Median of three saved samples. Each sample is already a still hold. */
export function medianBaselines(items: Baseline[]): Baseline {
  if (items.length === 0) throw new Error('Need at least one baseline sample');
  const first = items[0]!;
  const num = (pick: (item: Baseline) => number) => median(items.map(pick));
  const point = (pick: (item: Baseline) => NormPoint | undefined): NormPoint | undefined => {
    const points = items.map(pick).filter((value): value is NormPoint => Boolean(value));
    if (points.length === 0) return undefined;
    return { x: median(points.map((item) => item.x)), y: median(points.map((item) => item.y)) };
  };
  return {
    ...first,
    createdAt: new Date().toISOString(),
    ipdPx: num((item) => item.ipdPx),
    headDropNorm: num((item) => item.headDropNorm),
    shrugNorm: num((item) => item.shrugNorm),
    roundNorm: num((item) => item.roundNorm),
    shoulderAngleDeg: num((item) => item.shoulderAngleDeg),
    eyeAngleDeg: num((item) => item.eyeAngleDeg),
    shoulderWidthPx: num((item) => item.shoulderWidthPx),
    focalPx: num((item) => item.focalPx),
    screenDistanceIn: num((item) => item.screenDistanceIn),
    nose: point((item) => item.nose) ?? first.nose,
    leftEye: point((item) => item.leftEye) ?? first.leftEye,
    rightEye: point((item) => item.rightEye) ?? first.rightEye,
    leftEar: point((item) => item.leftEar),
    rightEar: point((item) => item.rightEar),
    leftShoulder: point((item) => item.leftShoulder) ?? first.leftShoulder,
    rightShoulder: point((item) => item.rightShoulder) ?? first.rightShoulder,
  };
}

export function rememberBaseline(history: Baseline[], previous: Baseline | null, limit = postureConfig.calibration.historyLimit): Baseline[] {
  if (!previous) return history.slice(0, limit);
  return [previous, ...history.filter((item) => item.createdAt !== previous.createdAt)].slice(0, limit);
}

export function appendGlowAttempt(log: GlowAttempt[], attempt: GlowAttempt, limit = 30): GlowAttempt[] {
  return [...log, attempt].slice(-limit);
}

function flag(alignment: Alignment | null, id: GuideId): boolean {
  return alignment?.guides.find((guide) => guide.id === id)?.aligned ?? false;
}
