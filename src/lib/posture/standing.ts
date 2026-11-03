import { postureConfig } from './config';
import { aspectFactor, focalFor, lengthRatio, VGA_HEIGHT, vgaPixels } from './resolution';
import { subScore } from './score';
import { dist, frameSignals, mid, tiltFromHorizontalDeg } from './signals';
import type { Baseline, Landmarks, Point2D, PostureScore, SignalKey } from './types';

export interface StandSignals {
  confidence: number;
  baseline: number | null;
  torso: number;
  transition: number;
  hipsVisible: boolean;
  torsoRatio: number;
  cameraMoved: boolean;
}

export interface ModeState {
  mode: 'sitting' | 'standing';
  candidate: 'sitting' | 'standing' | null;
  candidateMs: number;
  manual: boolean;
  /** When set, manual mode ends and auto returns. */
  manualUntilMs: number | null;
  atMs: number | null;
  confidence: number;
  signals: StandSignals;
  justSwitched: 'sitting' | 'standing' | null;
  suggestStand: boolean;
  yOffset: number;
  trail: { t: number; y: number }[];
  prev: BodyPoints | null;
}

interface BodyPoints {
  nose: Point2D;
  left: Point2D;
  right: Point2D;
  width: number;
  videoWidth: number;
  videoHeight: number;
}

export interface ModeInput {
  nowMs: number;
  auto: boolean;
  landmarks: Landmarks | null;
  sitting: Baseline | null;
  standing: Baseline | null;
  today: string;
  suggestDay: string | null;
}

export interface PoseHeights {
  faceY: number;
  shoulderY: number;
}

export interface StandingWatch {
  headDropMs: number;
  stillMs: number;
  lastX: number | null;
  lastY: number | null;
}

export function emptyStandSignals(): StandSignals {
  return { confidence: 0, baseline: null, torso: 0, transition: 0.5, hipsVisible: false, torsoRatio: 0, cameraMoved: false };
}

export function initialMode(): ModeState {
  return {
    mode: 'sitting',
    candidate: null,
    candidateMs: 0,
    manual: false,
    manualUntilMs: null,
    atMs: null,
    confidence: 0,
    signals: emptyStandSignals(),
    justSwitched: null,
    suggestStand: false,
    yOffset: 0,
    trail: [],
    prev: null,
  };
}

export function initialStandingWatch(): StandingWatch {
  return { headDropMs: 0, stillMs: 0, lastX: null, lastY: null };
}

export function poseHeights(landmarks: Landmarks): PoseHeights | null {
  if (!landmarks.nose || !landmarks.leftShoulder || !landmarks.rightShoulder || landmarks.videoHeight <= 0) return null;
  return {
    faceY: landmarks.nose.y / landmarks.videoHeight,
    shoulderY: mid(landmarks.leftShoulder, landmarks.rightShoulder).y / landmarks.videoHeight,
  };
}

export function baselineHeights(baseline: Baseline): PoseHeights {
  return {
    faceY: baseline.nose.y,
    shoulderY: (baseline.leftShoulder.y + baseline.rightShoulder.y) / 2,
  };
}

/** Confidence from both baselines, hips, torso, and the stand-up or sit-down motion. */
export function stepPostureMode(state: ModeState, input: ModeInput): ModeState {
  const dt = state.atMs === null ? 0 : Math.min(2000, Math.max(0, input.nowMs - state.atMs));
  let manual = state.manual;
  let manualUntilMs = state.manualUntilMs;
  if (manual && manualUntilMs !== null && input.nowMs >= manualUntilMs) {
    manual = false;
    manualUntilMs = null;
  }
  const read = readConfidence(state, input.landmarks, input.sitting, input.standing, input.nowMs);
  const { standConfidence, sitConfidence, switchMs } = postureConfig.standing;
  const want: ModeState['mode'] | null = read.signals.confidence >= standConfidence ? 'standing' : read.signals.confidence <= sitConfidence ? 'sitting' : null;
  const same = !want || (input.auto ? want === state.mode : want !== 'standing');
  const candidateMs = same ? 0 : (state.candidate === want ? state.candidateMs : 0) + dt;
  const held = Boolean(want) && candidateMs >= switchMs;
  let mode = state.mode;
  let justSwitched: ModeState['justSwitched'] = null;
  let suggestStand = input.suggestDay === input.today ? false : state.suggestStand;
  if (input.auto && !manual && held && want && want !== state.mode) {
    mode = want;
    justSwitched = want;
  } else if (!input.auto && held && want === 'standing' && input.suggestDay !== input.today) {
    suggestStand = true;
  }
  return {
    ...state,
    mode,
    candidate: same || held ? null : want,
    candidateMs: same || held ? 0 : candidateMs,
    manual,
    manualUntilMs,
    atMs: input.nowMs,
    confidence: read.signals.confidence,
    signals: read.signals,
    justSwitched,
    suggestStand,
    yOffset: read.yOffset,
    trail: read.trail,
    prev: read.prev,
  };
}

export function setManualMode(state: ModeState, mode: 'sitting' | 'standing'): ModeState {
  return { ...state, mode, manual: true, manualUntilMs: null, candidate: null, candidateMs: 0, justSwitched: null };
}

/** Undo a switch for 10 minutes, then let auto detection return. */
function readConfidence(
  state: ModeState,
  landmarks: Landmarks | null,
  sitting: Baseline | null,
  standing: Baseline | null,
  nowMs: number,
): { signals: StandSignals; yOffset: number; trail: { t: number; y: number }[]; prev: BodyPoints | null } {
  const body = bodyPoints(landmarks);
  if (!landmarks || !body) {
    return { signals: { ...state.signals, cameraMoved: false }, yOffset: state.yOffset, trail: state.trail, prev: state.prev };
  }
  const height = Math.max(1, landmarks.videoHeight);
  const shift = state.prev ? rigidShift(state.prev, body) : null;
  const cameraMoved = shift !== null;
  const dy = cameraMoved && shift ? shift.y / height : 0;
  const yOffset = state.yOffset + dy;
  const trail = (cameraMoved ? state.trail.map((sample) => ({ ...sample, y: sample.y + dy })) : state.trail).filter(
    (sample) => nowMs - sample.t <= 3500,
  );
  const y = body.nose.y / height;
  const nextTrail = [...trail, { t: nowMs, y }];
  const torso = torsoSignal(landmarks, body);
  const transition = cameraMoved ? 0.5 : transitionSignal(nextTrail, y, nowMs);
  const baseline = sitting && standing ? baselineCloseness(landmarks, body, sitting, standing, yOffset) : null;
  let confidence = blend(baseline, torso.score, transition, Boolean(standing));
  if (!standing && sitting) {
    const sitLike = clamp(1 - featureDistance(landmarks, body, sitting, yOffset) / 0.15, 0, 1);
    confidence *= 1 - 0.45 * sitLike;
  }
  return {
    signals: {
      confidence: clamp(confidence, 0, 1),
      baseline,
      torso: torso.score,
      transition,
      hipsVisible: torso.hipsVisible,
      torsoRatio: torso.torsoRatio,
      cameraMoved,
    },
    yOffset,
    trail: nextTrail,
    prev: body,
  };
}

function blend(baseline: number | null, torso: number, transition: number, hasStand: boolean): number {
  const parts: { w: number; v: number }[] = [];
  if (baseline !== null && hasStand) parts.push({ w: 0.5, v: baseline });
  parts.push({ w: hasStand ? 0.3 : 0.6, v: torso });
  if (transition !== 0.5) parts.push({ w: hasStand ? 0.2 : 0.4, v: transition });
  else if (!hasStand) parts.push({ w: 0.4, v: 0.35 });
  const weight = parts.reduce((sum, part) => sum + part.w, 0);
  if (weight <= 0) return 0;
  return parts.reduce((sum, part) => sum + part.w * part.v, 0) / weight;
}

function baselineCloseness(landmarks: Landmarks, body: BodyPoints, sitting: Baseline, standing: Baseline, yOffset: number): number {
  const sit = featureDistance(landmarks, body, sitting, yOffset);
  const stand = featureDistance(landmarks, body, standing, yOffset);
  if (sit + stand <= 0) return 0.5;
  return sit / (sit + stand);
}

function featureDistance(landmarks: Landmarks, body: BodyPoints, baseline: Baseline, yOffset: number): number {
  const ipd = eyeDistance(landmarks);
  const ipdTerm = baseline.ipdPx > 0 && ipd ? Math.abs(lengthRatio(ipd, landmarks.videoWidth, baseline.ipdPx, baseline.videoWidth) - 1) : 0;
  const widthTerm = baseline.shoulderWidthPx > 0 ? Math.abs(lengthRatio(body.width, landmarks.videoWidth, baseline.shoulderWidthPx, baseline.videoWidth) - 1) : 0;
  const noseTerm = Math.abs(body.nose.y / landmarks.videoHeight - yOffset - baseline.nose.y);
  const shoulderY = (body.left.y + body.right.y) / 2 / landmarks.videoHeight - yOffset;
  const baseShoulder = (baseline.leftShoulder.y + baseline.rightShoulder.y) / 2;
  return (ipdTerm + widthTerm + noseTerm + Math.abs(shoulderY - baseShoulder)) / 4;
}

function torsoSignal(landmarks: Landmarks, body: BodyPoints): { score: number; hipsVisible: boolean; torsoRatio: number } {
  const left = visibleHip(landmarks.leftHip);
  const right = visibleHip(landmarks.rightHip);
  if (!left || !right || body.width <= 0) return { score: 0.2, hipsVisible: false, torsoRatio: 0 };
  const ratio = dist(mid(body.left, body.right), mid(left, right)) / body.width;
  const score = clamp((ratio - 0.55) / 0.9, 0, 1) * 0.75 + 0.2;
  return { score, hipsVisible: true, torsoRatio: ratio };
}

function transitionSignal(trail: { t: number; y: number }[], nowY: number, nowMs: number): number {
  const window = trail.filter((sample) => nowMs - sample.t >= 1000 && nowMs - sample.t <= 3000);
  const oldest = window[0];
  if (!oldest || window.length < 2) return 0.5;
  const delta = oldest.y - nowY;
  if (Math.abs(delta) < 0.07) return 0.5;
  let reverse = 0;
  let previous = oldest.y;
  for (const sample of [...window, { t: nowMs, y: nowY }]) {
    const step = previous - sample.y;
    if (step !== 0 && Math.sign(step) !== Math.sign(delta)) reverse += Math.abs(step);
    previous = sample.y;
  }
  if (reverse > Math.abs(delta) * 0.4) return 0.5;
  return delta > 0 ? 0.88 : 0.12;
}

function rigidShift(prev: BodyPoints, curr: BodyPoints): Point2D | null {
  if (prev.width <= 0 || Math.abs(lengthRatio(curr.width, curr.videoWidth, prev.width, prev.videoWidth) - 1) > 0.08) return null;
  const deltas = [frameDelta(prev.nose, curr.nose, prev, curr), frameDelta(prev.left, curr.left, prev, curr), frameDelta(prev.right, curr.right, prev, curr)];
  const mags = deltas.map((item) => vgaPixels(item.x, item.y, curr.videoWidth, curr.videoHeight));
  if (Math.min(...mags) < 24) return null;
  const mean = { x: deltas.reduce((sum, item) => sum + item.x, 0) / deltas.length, y: deltas.reduce((sum, item) => sum + item.y, 0) / deltas.length };
  const meanMag = Math.hypot(mean.x, mean.y);
  const spread = Math.max(...deltas.map((item) => Math.hypot(item.x - mean.x, item.y - mean.y)));
  if (meanMag <= 0 || spread > meanMag * 0.35) return null;
  return mean;
}

function bodyPoints(landmarks: Landmarks | null): BodyPoints | null {
  if (!landmarks?.nose || !landmarks.leftShoulder || !landmarks.rightShoulder || landmarks.videoHeight <= 0) return null;
  return {
    nose: landmarks.nose,
    left: landmarks.leftShoulder,
    right: landmarks.rightShoulder,
    width: dist(landmarks.leftShoulder, landmarks.rightShoulder),
    videoWidth: landmarks.videoWidth,
    videoHeight: landmarks.videoHeight,
  };
}

function frameDelta(from: Point2D, to: Point2D, prev: BodyPoints, curr: BodyPoints): Point2D {
  const width = curr.videoWidth > 0 ? curr.videoWidth : 1;
  const height = curr.videoHeight > 0 ? curr.videoHeight : 1;
  const prevWidth = prev.videoWidth > 0 ? prev.videoWidth : width;
  const prevHeight = prev.videoHeight > 0 ? prev.videoHeight : height;
  return { x: (to.x / width - from.x / prevWidth) * width, y: (to.y / height - from.y / prevHeight) * height };
}

function eyeDistance(landmarks: Landmarks): number | undefined {
  if (!landmarks.leftEye || !landmarks.rightEye) return undefined;
  const gap = dist(landmarks.leftEye, landmarks.rightEye);
  return gap > 0 ? gap : undefined;
}

function visibleHip(point: Landmarks['leftHip']): Point2D | null {
  if (!point || (point.visibility !== undefined && point.visibility <= postureConfig.standing.hipVisibility)) return null;
  return point;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function undoPosture(state: ModeState, mode: 'sitting' | 'standing', nowMs: number): ModeState {
  return {
    ...state,
    mode,
    manual: true,
    manualUntilMs: nowMs + postureConfig.standing.manualHoldMs,
    candidate: null,
    candidateMs: 0,
    justSwitched: null,
  };
}

export function elbowAngleDeg(shoulder: Point2D, elbow: Point2D, wrist: Point2D): number | null {
  const upper = { x: shoulder.x - elbow.x, y: shoulder.y - elbow.y };
  const lower = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  const scale = Math.hypot(upper.x, upper.y) * Math.hypot(lower.x, lower.y);
  if (scale <= 0) return null;
  const cos = Math.min(1, Math.max(-1, (upper.x * lower.x + upper.y * lower.y) / scale));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function meanElbowAngle(landmarks: Landmarks): number | null {
  const angles = [
    landmarks.leftShoulder && landmarks.leftElbow && landmarks.leftWrist
      ? elbowAngleDeg(landmarks.leftShoulder, landmarks.leftElbow, landmarks.leftWrist)
      : null,
    landmarks.rightShoulder && landmarks.rightElbow && landmarks.rightWrist
      ? elbowAngleDeg(landmarks.rightShoulder, landmarks.rightElbow, landmarks.rightWrist)
      : null,
  ].filter((value): value is number => value !== null);
  if (angles.length === 0) return null;
  return angles.reduce((sum, value) => sum + value, 0) / angles.length;
}

export function elbowHint(angle: number | null): 'raise' | 'lower' | null {
  if (angle === null) return null;
  if (angle > postureConfig.standing.elbowMaxDeg) return 'raise';
  if (angle < postureConfig.standing.elbowMinDeg) return 'lower';
  return null;
}

export function hipLean(landmarks: Landmarks): { tiltDeg: number; shiftRatio: number; active: boolean } {
  if (!landmarks.leftShoulder || !landmarks.rightShoulder) return { tiltDeg: 0, shiftRatio: 0, active: false };
  const shoulders = mid(landmarks.leftShoulder, landmarks.rightShoulder);
  const width = Math.max(1, dist(landmarks.leftShoulder, landmarks.rightShoulder));
  const tiltDeg = Math.abs(tiltFromHorizontalDeg(landmarks.leftShoulder, landmarks.rightShoulder));
  const hips = landmarks.leftHip && landmarks.rightHip ? mid(landmarks.leftHip, landmarks.rightHip) : { x: landmarks.videoWidth / 2, y: shoulders.y };
  const shiftRatio = Math.abs(shoulders.x - hips.x) / width;
  const active = tiltDeg >= postureConfig.standing.hipTiltDeg && shiftRatio >= postureConfig.standing.hipShiftRatio;
  return { tiltDeg, shiftRatio, active };
}

export interface StandingFrame {
  raw: number;
  cue: string | null;
  issue?: SignalKey;
  watch: StandingWatch;
  stillDue: boolean;
}

export function standingFrame(
  landmarks: Landmarks,
  baseline: Baseline,
  previous: PostureScore | null,
  dtMs: number,
  watch: StandingWatch,
  deskTips: boolean,
): StandingFrame {
  const { standing } = postureConfig;
  const signals = frameSignals(landmarks, focalFor(landmarks, baseline));
  const frameScale = aspectFactor(landmarks.videoWidth, landmarks.videoHeight);
  const savedScale = aspectFactor(baseline.videoWidth, baseline.videoHeight);
  const leanDev = signals.ipdPx && baseline.ipdPx > 0 ? Math.max(0, lengthRatio(signals.ipdPx, landmarks.videoWidth, baseline.ipdPx, baseline.videoWidth) - 1) : 0;
  const headDropDev =
    signals.headDropNorm !== undefined && baseline.headDropNorm > 0
      ? Math.max(0, 1 - (signals.headDropNorm * frameScale) / (baseline.headDropNorm * savedScale))
      : 0;
  const hip = hipLean(landmarks);
  const hipDev = hip.active ? Math.max(hip.tiltDeg / standing.fullPenalty.tilt, hip.shiftRatio) : Math.min(hip.tiltDeg / 90, hip.shiftRatio);
  const angle = meanElbowAngle(landmarks);
  const hint = elbowHint(angle);
  const elbowDev = angle === null || !hint ? 0 : hint === 'raise' ? angle - standing.elbowMaxDeg : standing.elbowMinDeg - angle;
  const parts: { key: SignalKey; score: number; weight: number }[] = [
    { key: 'lean', score: subScore(leanDev, standing.deadZone.forwardHead, standing.fullPenalty.forwardHead), weight: standing.weights.forwardHead },
    { key: 'headDrop', score: subScore(headDropDev, standing.deadZone.headDrop, standing.fullPenalty.headDrop), weight: standing.weights.headDrop },
    { key: 'tilt', score: subScore(hipDev, standing.deadZone.hipLean, standing.fullPenalty.hipLean), weight: standing.weights.hipLean },
  ];
  if (angle !== null) {
    parts.push({ key: 'shoulders', score: subScore(elbowDev, standing.deadZone.elbow, standing.fullPenalty.elbow), weight: standing.weights.elbow });
  }
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const raw = weightSum <= 0 ? (previous?.raw ?? 100) : parts.reduce((sum, part) => sum + part.weight * part.score, 0) / weightSum;
  const headDropMs = headDropDev > standing.deadZone.headDrop ? watch.headDropMs + dtMs : 0;
  const moved = movement(landmarks, watch);
  const stillMs = moved > VGA_HEIGHT * standing.stillnessRatio ? 0 : watch.stillMs + dtMs;
  const point = landmarks.leftShoulder && landmarks.rightShoulder ? mid(landmarks.leftShoulder, landmarks.rightShoulder) : null;
  let cue: string | null = null;
  let issue: SignalKey | undefined;
  if (deskTips && hint === 'raise') {
    cue = 'Raise your desk a little';
    issue = 'shoulders';
  } else if (deskTips && hint === 'lower') {
    cue = 'Lower your desk a little';
    issue = 'shoulders';
  } else if (hip.active) {
    cue = 'Bring your weight back over both feet';
    issue = 'tilt';
  } else if (headDropMs >= standing.headDropSustainMs) {
    cue = 'Raise your screen to eye level';
    issue = 'headDrop';
  } else if (leanDev > standing.deadZone.forwardHead) {
    cue = 'Ease your head back over your shoulders';
    issue = 'lean';
  }
  const lowest = parts.reduce((best, part) => (part.score < best.score ? part : best), parts[0]!);
  return {
    raw,
    cue,
    issue: issue ?? (lowest.score < 100 ? lowest.key : undefined),
    watch: { headDropMs, stillMs, lastX: point?.x ?? watch.lastX, lastY: point?.y ?? watch.lastY },
    stillDue: false,
  };
}

function movement(landmarks: Landmarks, watch: StandingWatch): number {
  if (!landmarks.leftShoulder || !landmarks.rightShoulder || watch.lastX === null || watch.lastY === null) return 0;
  const point = mid(landmarks.leftShoulder, landmarks.rightShoulder);
  return vgaPixels(point.x - watch.lastX, point.y - watch.lastY, landmarks.videoWidth, landmarks.videoHeight);
}
