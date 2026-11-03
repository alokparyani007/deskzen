import { calibrationConfig } from './config';
import { screenDistanceIn, tiltFromHorizontalDeg } from '../lib/posture/signals';
import type { Landmarks } from '../lib/posture/types';

export type SetupChipId = 'frame' | 'distance' | 'angle' | 'facing' | 'level' | 'light';
export type CoachArrow = 'left' | 'right' | 'up' | 'down' | 'none';
export type GuideTone = 'amber' | 'sky' | 'emerald';

export interface SetupChip {
  id: SetupChipId;
  label: string;
  passed: boolean;
  points: number;
}

export interface LightSample {
  face: number;
  background: number;
}

export interface SetupHold {
  frame: boolean;
  distance: boolean;
  angle: boolean;
  facing: boolean;
  level: boolean;
  light: boolean;
}

export interface OutlineFit {
  headX: number;
  headY: number;
  scale: number;
  shoulderX: number;
  shoulderY: number;
  shoulderScale: number;
}

export interface SetupView {
  chips: SetupChip[];
  score: number;
  pill: string;
  arrow: CoachArrow;
  hold: SetupHold;
}

export interface SpeakClock {
  line: string | null;
  atMs: number;
}

const LABELS: Record<SetupChipId, string> = {
  frame: 'In frame',
  distance: 'Distance',
  angle: 'Camera angle',
  facing: 'Facing',
  level: 'Head level',
  light: 'Light',
};

const ORDER: SetupChipId[] = ['frame', 'distance', 'angle', 'facing', 'level', 'light'];

export const emptySetupHold = (): SetupHold => ({
  frame: false,
  distance: false,
  angle: false,
  facing: false,
  level: false,
  light: false,
});

/** When the continue button appears. Setup never leaves on its own. */
export function setupContinue(score: number, elapsedMs: number): string | null {
  const cfg = calibrationConfig.setup;
  if (elapsedMs < cfg.minStayMs) return null;
  if (score >= cfg.greatScore) return 'Continue';
  if ((score >= cfg.goodEnoughHighScore && elapsedMs >= cfg.goodEnoughHighMs) || elapsedMs >= cfg.goodEnoughMs) {
    return 'Good enough, keep going';
  }
  return null;
}

export function guideTone(score: number): GuideTone {
  if (score >= calibrationConfig.setup.lookingGreatScore) return 'emerald';
  if (score >= calibrationConfig.setup.goodEnoughHighScore) return 'sky';
  return 'amber';
}

/**
 * Map a camera pixel into the mirrored 16:9 guide.
 * object-cover crops the longer side, then the preview is mirrored.
 */
export function toGuideSpace(xPx: number, yPx: number, videoWidth: number, videoHeight: number): { x: number; y: number } {
  const nx = videoWidth > 0 ? xPx / videoWidth : 0;
  const ny = videoHeight > 0 ? yPx / videoHeight : 0;
  const videoAspect = videoHeight > 0 ? videoWidth / videoHeight : calibrationConfig.setup.guideAspect;
  const guideAspect = calibrationConfig.setup.guideAspect;
  if (videoAspect < guideAspect) {
    const visible = videoAspect / guideAspect;
    const crop = (1 - visible) / 2;
    return { x: 1 - nx, y: (ny - crop) / visible };
  }
  if (videoAspect > guideAspect) {
    const visible = guideAspect / videoAspect;
    const crop = (1 - visible) / 2;
    return { x: 1 - (nx - crop) / visible, y: ny };
  }
  return { x: 1 - nx, y: ny };
}

/** Speak only when the line changes, at most every 4 s, and never repeat one within 8 s. */
export function canSpeak(line: string, nowMs: number, clock: SpeakClock): boolean {
  if (!line) return false;
  const { speakGapMs, speakRepeatMs } = calibrationConfig.setup;
  if (clock.atMs > 0 && nowMs - clock.atMs < speakGapMs) return false;
  if (clock.line === line && nowMs - clock.atMs < speakRepeatMs) return false;
  return true;
}

/** Camera-setup score. Posture is coached later, on the user's own body. */
export function setupCheck(landmarks: Landmarks | null, light?: LightSample, held: SetupHold = emptySetupHold()): SetupView {
  const parts: Record<SetupChipId, Part> = {
    frame: framePart(landmarks, held.frame),
    distance: distancePart(landmarks, held.distance),
    angle: anglePart(landmarks, held.angle),
    facing: facingPart(landmarks, held.facing),
    level: levelPart(landmarks, held.level),
    light: lightPart(landmarks, light, held.light),
  };
  const chips = ORDER.map((id) => ({
    id,
    label: `${LABELS[id]} ${parts[id].points}/${parts[id].max}`,
    passed: parts[id].points >= parts[id].max,
    points: parts[id].points,
  }));
  const score = chips.reduce((sum, chip) => sum + chip.points, 0);
  const coach = coachLine(parts);
  return {
    chips,
    score,
    pill: coach.pill,
    arrow: coach.arrow,
    hold: {
      frame: parts.frame.full,
      distance: parts.distance.full,
      angle: parts.angle.full,
      facing: parts.facing.full,
      level: parts.level.full,
      light: parts.light.full,
    },
  };
}

/** Scale the guide to this person's face and shoulders. SVG space is 1280 by 720. */
export function outlineFit(landmarks: Landmarks | null): OutlineFit | null {
  if (!landmarks || landmarks.videoWidth <= 0 || landmarks.videoHeight <= 0 || landmarks.faceCount !== 1) return null;
  const width = faceWidthNorm(landmarks);
  const head = headInGuide(landmarks);
  if (width === undefined || !head) return null;
  const cfg = calibrationConfig.setup;
  const shoulders = shoulderGuide(landmarks);
  return {
    headX: head.x * 1280,
    headY: head.y * 720,
    scale: width / cfg.guideHeadWidth,
    shoulderX: (shoulders?.x ?? head.x) * 1280,
    shoulderY: (shoulders?.y ?? head.y + 0.28) * 720,
    shoulderScale: shoulders ? shoulders.span / cfg.guideShoulderSpan : width / cfg.guideHeadWidth,
  };
}

/** Shoulders rise, then drop. Image y grows downward. */
export function shoulderRollSeen(ys: readonly number[]): boolean {
  if (ys.length < 6) return false;
  const peak = Math.max(...ys.map((value) => Math.abs(value)));
  const step = 4 * (peak > 0 ? peak / 100 : 1);
  let rose = false;
  for (let index = 1; index < ys.length; index += 1) {
    const delta = ys[index]! - ys[index - 1]!;
    if (!rose && delta < -step) rose = true;
    else if (rose && delta > step) return true;
  }
  return false;
}

interface Part {
  points: number;
  max: number;
  full: boolean;
  gap: number;
  pill: string;
  arrow: CoachArrow;
}

function framePart(landmarks: Landmarks | null, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.frame;
  const head = headInGuide(landmarks);
  if (!landmarks || landmarks.faceCount !== 1 || !head) return missed(max, 'Move a little to your left');
  if (!shouldersVisible(landmarks)) return missed(max, 'Move back so your shoulders show');
  const extra = held ? 0.05 : 0;
  const inside = head.x >= cfg.zoneXMin - extra && head.x <= cfg.zoneXMax + extra && head.y >= cfg.zoneYMin - extra && head.y <= cfg.zoneYMax + extra;
  const dx = head.x < cfg.zoneXMin ? cfg.zoneXMin - head.x : head.x > cfg.zoneXMax ? head.x - cfg.zoneXMax : 0;
  const dy = head.y < cfg.zoneYMin ? cfg.zoneYMin - head.y : head.y > cfg.zoneYMax ? head.y - cfg.zoneYMax : 0;
  const atEdge = head.x <= 0.02 || head.x >= 0.98 || head.y <= 0.02 || head.y >= 0.98;
  const zone = inside ? { points: max, full: true } : atEdge ? { points: 0, full: false } : gradeLower(Math.hypot(dx, dy), 0, 0.3, max, false);
  const top = headTop(landmarks);
  const clearance = top === undefined ? { points: max, full: true } : gradeHigher(top, cfg.headClear, 0, max, held);
  const horizontal = dx >= dy;
  const pill = !clearance.full && clearance.points <= zone.points
    ? 'Scoot back a little'
    : horizontal
      ? head.x < 0.5 ? 'Move a little to your right' : 'Move a little to your left'
      : head.y < cfg.zoneYMin ? 'Scoot back a little' : 'Come a little closer';
  const arrow: CoachArrow = horizontal ? (head.x < 0.5 ? 'right' : 'left') : head.y < cfg.zoneYMin ? 'down' : 'up';
  return combine(max, zone, clearance, pill, arrow);
}

function facingPart(landmarks: Landmarks | null, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.facing;
  const yaw = yawDeg(landmarks);
  if (yaw === undefined) return missed(max, 'Turn your face toward the screen');
  const graded = gradeLower(Math.abs(yaw), cfg.yawFullDeg, cfg.yawZeroDeg, max, held);
  return { ...graded, max, gap: max - graded.points, pill: 'Turn your face toward the screen', arrow: 'none' };
}

function distancePart(landmarks: Landmarks | null, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.distance;
  const width = faceWidthNorm(landmarks);
  const inches = landmarks ? screenDistanceIn(landmarks) : undefined;
  if (width === undefined && inches === undefined) return missed(max, 'Come a little closer', 'up');
  const widthGrade = width === undefined ? undefined : gradeBand(width, cfg.faceWidthFullMin, cfg.faceWidthFullMax, cfg.faceWidthZeroMin, cfg.faceWidthZeroMax, max, held);
  const inchGrade = inches === undefined ? undefined : gradeBand(inches, cfg.distanceFullMinIn, cfg.distanceFullMaxIn, cfg.distanceZeroMinIn, cfg.distanceZeroMaxIn, max, held);
  const graded = better(widthGrade, inchGrade);
  const tooClose = (width !== undefined && width > cfg.faceWidthFullMax) || (inches !== undefined && inches < cfg.distanceFullMinIn && (width === undefined || width > cfg.faceWidthFullMax));
  const pill = tooClose ? 'Scoot back a little' : 'Come a little closer';
  return { ...graded, max, gap: max - graded.points, pill, arrow: tooClose ? 'down' : 'up' };
}

function anglePart(landmarks: Landmarks | null, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.angle;
  if (!landmarks || landmarks.faceCount !== 1 || landmarks.pitchDeg === undefined) return missed(max, 'Raise your laptop about 2 inches', 'up');
  const graded = gradeLower(Math.abs(landmarks.pitchDeg), cfg.pitchFullDeg, cfg.pitchZeroDeg, max, held);
  const pill = landmarks.pitchDeg > 0 ? 'Raise your laptop about 2 inches' : 'Tilt your screen back a bit';
  return { ...graded, max, gap: max - graded.points, pill, arrow: 'up' };
}

function levelPart(landmarks: Landmarks | null, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.level;
  if (!landmarks || landmarks.faceCount !== 1 || !landmarks.leftEye || !landmarks.rightEye) return missed(max, 'Straighten your head');
  const roll = tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye);
  const graded = gradeLower(Math.abs(roll), cfg.rollFullDeg, cfg.rollZeroDeg, max, held);
  return { ...graded, max, gap: max - graded.points, pill: 'Straighten your head', arrow: 'none' };
}

function lightPart(landmarks: Landmarks | null, light: LightSample | undefined, held: boolean): Part {
  const cfg = calibrationConfig.setup;
  const max = cfg.points.light;
  if (!landmarks || landmarks.faceCount !== 1) return missed(max, 'Add a little light in front of you');
  if (!light) return { points: max, max, full: true, gap: 0, pill: 'Add a little light in front of you', arrow: 'none' };
  const dark = gradeHigher(light.face, cfg.lightFullFace, cfg.lightZeroFace, max, held);
  const backlit = light.background - light.face;
  const back = light.face >= 0.4 || backlit <= cfg.backlitFull
    ? { points: max, full: true }
    : gradeLower(backlit, cfg.backlitFull, cfg.backlitZero, max, held);
  const backlitWorse = back.points < dark.points;
  return combine(max, dark, back, backlitWorse ? "There's bright light behind you. Face the window instead." : 'Add a little light in front of you', 'none');
}

function coachLine(parts: Record<SetupChipId, Part>): { pill: string; arrow: CoachArrow } {
  const focus = ORDER.reduce((best, id) => (parts[id].gap > parts[best].gap ? id : best));
  if (parts[focus].gap <= 0) return { pill: 'Looking great. Hold that.', arrow: 'none' };
  return { pill: parts[focus].pill, arrow: parts[focus].arrow };
}

function headInGuide(landmarks: Landmarks | null): { x: number; y: number } | null {
  if (!landmarks || landmarks.faceCount !== 1 || landmarks.videoWidth <= 0) return null;
  const left = landmarks.leftEye;
  const right = landmarks.rightEye;
  const point = left && right ? { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 } : landmarks.nose;
  if (!point) return null;
  return toGuideSpace(point.x, point.y, landmarks.videoWidth, landmarks.videoHeight);
}

function shouldersVisible(landmarks: Landmarks): boolean {
  const min = calibrationConfig.setup.shoulderVisibility;
  const left = landmarks.leftShoulder;
  const right = landmarks.rightShoulder;
  return Boolean(left && right && (left.visibility ?? 1) >= min && (right.visibility ?? 1) >= min);
}

function faceWidthNorm(landmarks: Landmarks | null): number | undefined {
  const box = landmarks?.faceBox;
  if (!box || box.w <= 0) return undefined;
  return box.w;
}

function headTop(landmarks: Landmarks): number | undefined {
  if (landmarks.faceTopPx !== undefined && landmarks.videoHeight > 0) return landmarks.faceTopPx / landmarks.videoHeight;
  return landmarks.faceBox?.y;
}

function shoulderGuide(landmarks: Landmarks): { x: number; y: number; span: number } | undefined {
  if (!landmarks.leftShoulder || !landmarks.rightShoulder || landmarks.videoWidth <= 0) return undefined;
  const left = toGuideSpace(landmarks.leftShoulder.x, landmarks.leftShoulder.y, landmarks.videoWidth, landmarks.videoHeight);
  const right = toGuideSpace(landmarks.rightShoulder.x, landmarks.rightShoulder.y, landmarks.videoWidth, landmarks.videoHeight);
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2, span: Math.abs(right.x - left.x) };
}

function yawDeg(landmarks: Landmarks | null): number | undefined {
  if (!landmarks || landmarks.faceCount !== 1) return undefined;
  if (landmarks.yawDeg !== undefined && Number.isFinite(landmarks.yawDeg)) return landmarks.yawDeg;
  if (!landmarks.nose || !landmarks.leftEye || !landmarks.rightEye) return undefined;
  const span = landmarks.rightEye.x - landmarks.leftEye.x;
  const minSpan = landmarks.videoWidth > 0 ? landmarks.videoWidth / 640 : 1;
  if (Math.abs(span) < minSpan) return undefined;
  const mid = (landmarks.leftEye.x + landmarks.rightEye.x) / 2;
  const offset = (landmarks.nose.x - mid) / (span / 2);
  return (Math.atan(offset) * 180) / Math.PI;
}

function missed(max: number, pill: string, arrow: CoachArrow = 'none'): Part {
  return { points: 0, max, full: false, gap: max, pill, arrow };
}

function combine(max: number, left: Graded, right: Graded, pill: string, arrow: CoachArrow): Part {
  const points = Math.min(left.points, right.points);
  const full = left.full && right.full;
  return { points, max, full, gap: max - points, pill, arrow };
}

interface Graded {
  points: number;
  full: boolean;
}

function gradeLower(value: number, full: number, zero: number, max: number, held: boolean): Graded {
  const stay = held && value <= full * calibrationConfig.setup.holdFactor;
  if (value <= full || stay) return { points: max, full: true };
  return rounded(fade(value, full, zero, max), max);
}

function gradeHigher(value: number, full: number, zero: number, max: number, held: boolean): Graded {
  const stay = held && value >= full / calibrationConfig.setup.holdFactor;
  if (value >= full || stay) return { points: max, full: true };
  return rounded(fadeLow(value, full, zero, max), max);
}

function gradeBand(value: number, fullMin: number, fullMax: number, zeroMin: number, zeroMax: number, max: number, held: boolean): Graded {
  if (value >= fullMin && value <= fullMax) return { points: max, full: true };
  const mid = (fullMin + fullMax) / 2;
  const half = ((fullMax - fullMin) / 2) * calibrationConfig.setup.holdFactor;
  if (held && Math.abs(value - mid) <= half) return { points: max, full: true };
  const raw = value < fullMin ? fadeLow(value, fullMin, zeroMin, max) : fade(value, fullMax, zeroMax, max);
  return rounded(raw, max);
}

function better(left: Graded | undefined, right: Graded | undefined): Graded {
  if (!left) return right ?? { points: 0, full: false };
  if (!right) return left;
  return left.points >= right.points ? left : right;
}

function rounded(raw: number, max: number): Graded {
  const points = Math.max(0, Math.min(max, Math.round(raw)));
  return { points, full: points >= max };
}

function fade(value: number, full: number, zero: number, max: number): number {
  if (value <= full) return max;
  if (value >= zero || zero <= full) return 0;
  return ((zero - value) / (zero - full)) * max;
}

function fadeLow(value: number, full: number, zero: number, max: number): number {
  if (value >= full) return max;
  if (value <= zero || full <= zero) return 0;
  return ((value - zero) / (full - zero)) * max;
}
