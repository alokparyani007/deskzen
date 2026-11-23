import { screenDistanceIn, tiltFromHorizontalDeg } from '../../lib/posture/signals';
import type { Landmark, Landmarks } from '../../lib/posture/types';
import { CHIP_ORDER, zenConfig, type ChipId, type PoseMode } from './zenConfig';

export interface RuleHistory {
  /** Tallest neck ratio seen on this step, including the current frame. */
  maxNeckRatio: number;
  /** How long R11 has been the only failing picture check. */
  r11OnlyMs: number;
  /** How long two ambiguous faces have stayed in frame. */
  multiMs: number;
}

export const EMPTY_HISTORY: RuleHistory = { maxNeckRatio: 0, r11OnlyMs: 0, multiMs: 0 };

export interface PoseMeasures {
  present: boolean;
  eyeMidX: number | null;
  eyeMidY: number | null;
  headRollDeg: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
  shouldersVisible: boolean;
  /** Both outer shoulder caps (landmark + shoulderCapMargin x width) inside the frame. Null when shoulders are not visible. */
  shoulderCapsInFrame: boolean | null;
  shoulderTiltDeg: number | null;
  noseOffset: number | null;
  neckRatio: number | null;
  faceShoulderRatio: number | null;
  faceWidthShare: number | null;
  distanceIn: number | null;
  faceCount: number;
  faceAmbiguous: boolean;
  shoulderMidX: number | null;
  shoulderMidY: number | null;
  shoulderWidth: number | null;
  faceWidth: number | null;
  noseX: number | null;
  noseY: number | null;
  leftEyeX: number | null;
  leftEyeY: number | null;
  rightEyeX: number | null;
  rightEyeY: number | null;
  leftShoulderX: number | null;
  leftShoulderY: number | null;
  rightShoulderX: number | null;
  rightShoulderY: number | null;
}

export type RuleIssue = 'camera-left' | 'camera-right' | 'high' | 'low' | 'close' | 'far';

export interface RuleResult {
  id: string;
  chip: ChipId | null;
  pass: boolean | null;
  value: number | null;
  deviation: number;
  issue?: RuleIssue;
}

export interface PoseBaseline {
  shoulderMidX: number;
  shoulderMidY: number;
  shoulderWidth: number;
  faceWidth: number;
  noseOffset: number;
  neckRatio: number;
  faceShoulderRatio: number;
  shoulderRollDeg: number;
  headRollDeg: number;
  eyeLineY: number;
  pitchDeg?: number;
  yawDeg?: number;
  distanceIn?: number;
}

export interface CoachCopy {
  title: string;
  helper: string;
}

const OPENING: CoachCopy = {
  title: "Let's set your Zen",
  helper: "Match the picture on the right. When all four are green, I'll take your picture.",
};

export const STEP_IN_COPY: CoachCopy = {
  title: 'Step into view',
  helper: 'Sit where the camera can see your head and shoulders.',
};

export const READY_COPY: CoachCopy = {
  title: 'Perfect. Hold still',
  helper: 'Taking your picture in 3…',
};

export const JUST_YOU = 'Just you in the frame, please';

function num(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function vis(point: Landmark | undefined): number {
  return point?.visibility ?? 0;
}

function norm(point: Landmark | undefined, size: number): number | null {
  if (!point || size <= 0) return null;
  const value = point.x / size;
  return Number.isFinite(value) ? value : null;
}

function normY(point: Landmark | undefined, size: number): number | null {
  if (!point || size <= 0) return null;
  const value = point.y / size;
  return Number.isFinite(value) ? value : null;
}

function faceWidthPx(frame: Landmarks): number | null {
  const width = frame.videoWidth;
  if (width <= 0) return null;
  if (frame.faceBox && frame.faceBox.w > 0) return frame.faceBox.w * width;
  if (frame.leftFace && frame.rightFace) return Math.abs(frame.rightFace.x - frame.leftFace.x);
  if (frame.leftEye && frame.rightEye) return 2.2 * Math.abs(frame.rightEye.x - frame.leftEye.x);
  return null;
}

export function measurePose(frame: Landmarks): PoseMeasures {
  const width = frame.videoWidth;
  const height = frame.videoHeight;
  const leftEye = frame.leftEye;
  const rightEye = frame.rightEye;
  const left = frame.leftShoulder;
  const right = frame.rightShoulder;
  const nose = frame.nose;
  const eyeMidX = leftEye && rightEye && width > 0 ? (leftEye.x + rightEye.x) / 2 / width : null;
  const eyeMidY = leftEye && rightEye && height > 0 ? (leftEye.y + rightEye.y) / 2 / height : null;
  const bothEyes = Boolean(leftEye && rightEye && vis(leftEye) >= zenConfig.presenceVis && vis(rightEye) >= zenConfig.presenceVis);
  const present = vis(nose) >= zenConfig.presenceVis || bothEyes;
  const swPx = left && right ? Math.hypot(right.x - left.x, right.y - left.y) : 0;
  const shoulderWidth = width > 0 && swPx > 1 ? swPx / width : null;
  const shoulderMidX = left && right && width > 0 ? (left.x + right.x) / 2 / width : null;
  const shoulderMidY = left && right && height > 0 ? (left.y + right.y) / 2 / height : null;
  const facePx = faceWidthPx(frame);
  const faceWidth = facePx !== null && width > 0 ? facePx / width : null;
  const noseX = norm(nose, width);
  const noseY = normY(nose, height);
  const noseOffset = noseX !== null && shoulderMidX !== null && shoulderWidth !== null && shoulderWidth > 0 ? Math.abs(noseX - shoulderMidX) / shoulderWidth : null;
  const neckRatio = noseY !== null && shoulderMidY !== null && shoulderWidth !== null && shoulderWidth > 0 ? (shoulderMidY - noseY) / shoulderWidth : null;
  const inFrame = (point: Landmark | undefined) => {
    if (!point || width <= 0 || height <= 0) return false;
    const x = point.x / width;
    const y = point.y / height;
    return x >= zenConfig.shoulderFrame.minX && x <= zenConfig.shoulderFrame.maxX && y <= zenConfig.shoulderFrame.maxY;
  };
  const shouldersVisible = Boolean(left && right && vis(left) >= zenConfig.shoulderVis && vis(right) >= zenConfig.shoulderVis && inFrame(left) && inFrame(right));
  const capReach = zenConfig.shoulderCapMargin * swPx;
  const shoulderCapsInFrame = shouldersVisible && left && right && swPx > 1
    ? Math.min(left.x, right.x) - capReach >= width * zenConfig.edgeTouch && Math.max(left.x, right.x) + capReach <= width * (1 - zenConfig.edgeTouch)
    : null;
  return {
    present,
    eyeMidX: num(eyeMidX),
    eyeMidY: num(eyeMidY),
    headRollDeg: leftEye && rightEye ? num(tiltFromHorizontalDeg(leftEye, rightEye)) : null,
    yawDeg: num(frame.yawDeg),
    pitchDeg: num(frame.pitchDeg),
    shouldersVisible,
    shoulderCapsInFrame,
    shoulderTiltDeg: left && right ? num(tiltFromHorizontalDeg(left, right)) : null,
    noseOffset: num(noseOffset),
    neckRatio: num(neckRatio),
    faceShoulderRatio: facePx !== null && swPx > 1 ? num(facePx / swPx) : null,
    faceWidthShare: num(faceWidth),
    distanceIn: num(screenDistanceIn(frame) ?? null),
    faceCount: frame.faceCount,
    faceAmbiguous: Boolean(frame.faceAmbiguous),
    shoulderMidX: num(shoulderMidX),
    shoulderMidY: num(shoulderMidY),
    shoulderWidth: num(shoulderWidth),
    faceWidth: num(faceWidth),
    noseX,
    noseY,
    leftEyeX: norm(leftEye, width),
    leftEyeY: normY(leftEye, height),
    rightEyeX: norm(rightEye, width),
    rightEyeY: normY(rightEye, height),
    leftShoulderX: norm(left, width),
    leftShoulderY: normY(left, height),
    rightShoulderX: norm(right, width),
    rightShoulderY: normY(right, height),
  };
}

function rule(id: string, chip: ChipId | null, pass: boolean | null, value: number | null, deviation = 0, issue?: RuleIssue): RuleResult {
  return { id, chip, pass, value: num(value), deviation: Number.isFinite(deviation) ? Math.max(0, deviation) : 0, issue };
}

function band(value: number | null, min: number, max: number, low: RuleIssue, high: RuleIssue): Pick<RuleResult, 'pass' | 'value' | 'deviation' | 'issue'> {
  if (value === null) return { pass: null, value: null, deviation: 0 };
  if (value < min) return { pass: false, value, deviation: (min - value) / Math.max(0.01, max - min), issue: low };
  if (value > max) return { pass: false, value, deviation: (value - max) / Math.max(0.01, max - min), issue: high };
  return { pass: true, value, deviation: 0 };
}

export function snapshotRules(measures: PoseMeasures, mode: PoseMode, history: RuleHistory = EMPTY_HISTORY): RuleResult[] {
  const tiltLimit = zenConfig.shoulderTiltDeg[mode];
  const offsetLimit = zenConfig.noseOffset[mode];
  const faceBand = zenConfig.faceShoulder[mode];
  const distance = zenConfig.distanceIn[mode];
  const share = zenConfig.faceWidthShare[mode];
  const tallest = Math.max(history.maxNeckRatio, measures.neckRatio ?? 0);
  const neck = measures.neckRatio;
  const neckPass = neck === null ? null : neck >= zenConfig.neckRatioMin && neck >= zenConfig.neckOfMax * tallest;
  const eyes = band(measures.eyeMidX, zenConfig.headCenter.min, zenConfig.headCenter.max, 'camera-left', 'camera-right');
  const eyeLine = band(measures.eyeMidY, zenConfig.eyeLine.min, zenConfig.eyeLine.max, 'high', 'low');
  const roll = measures.headRollDeg;
  const yaw = measures.yawDeg;
  const pitch = measures.pitchDeg;
  const tilt = measures.shoulderTiltDeg;
  const offset = measures.noseOffset;
  const face = band(measures.faceShoulderRatio, faceBand.min, faceBand.max, 'far', 'close');
  const inches = band(measures.distanceIn, distance.min, distance.max, 'close', 'far');
  const widthShare = band(measures.faceWidthShare, share.min, share.max, 'far', 'close');
  const distanceRule = measures.distanceIn !== null ? inches : { pass: null, value: null, deviation: 0 };
  const shareRule = measures.distanceIn !== null ? { pass: null, value: widthShare.value, deviation: 0 } : widthShare;
  const results: RuleResult[] = [
    rule('R1', null, measures.present, measures.present ? 1 : 0),
    rule('R2', 'head', eyes.pass, eyes.value, eyes.deviation, eyes.issue),
    rule('R3', 'head', eyeLine.pass, eyeLine.value, eyeLine.deviation, eyeLine.issue),
    rule('R4', 'head', roll === null ? null : Math.abs(roll) <= zenConfig.headRollDeg, roll, roll === null ? 0 : Math.max(0, Math.abs(roll) - zenConfig.headRollDeg) / zenConfig.headRollDeg),
    rule('R5', 'head', yaw === null ? null : Math.abs(yaw) <= zenConfig.yawDeg, yaw, yaw === null ? 0 : Math.max(0, Math.abs(yaw) - zenConfig.yawDeg) / zenConfig.yawDeg),
    rule('R6', 'head', pitch === null ? null : Math.abs(pitch) <= zenConfig.pitchDeg, pitch, pitch === null ? 0 : Math.max(0, Math.abs(pitch) - zenConfig.pitchDeg) / zenConfig.pitchDeg),
    rule('R7', 'shoulders', measures.shouldersVisible, measures.shouldersVisible ? 1 : 0),
    rule('R8', 'shoulders', tilt === null ? null : Math.abs(tilt) <= tiltLimit, tilt, tilt === null ? 0 : Math.max(0, Math.abs(tilt) - tiltLimit) / tiltLimit),
    rule('R9', 'shoulders', offset === null ? null : offset <= offsetLimit, offset, offset === null ? 0 : Math.max(0, offset - offsetLimit) / offsetLimit),
    rule('R10', 'tall', neckPass, neck, neck === null ? 0 : Math.max(0, zenConfig.neckRatioMin - neck, zenConfig.neckOfMax * tallest - neck)),
    rule('R11', 'tall', face.pass, face.value, face.deviation, face.issue),
    rule('R12', 'distance', distanceRule.pass, distanceRule.value, distanceRule.deviation, distanceRule.issue),
    rule('R12b', 'distance', shareRule.pass, shareRule.value, shareRule.deviation, shareRule.issue),
    rule('R12c', 'distance', measures.shoulderCapsInFrame, measures.shoulderCapsInFrame === null ? null : measures.shoulderCapsInFrame ? 1 : 0, measures.shoulderCapsInFrame === false ? 1 : 0, measures.shoulderCapsInFrame === false ? 'close' : undefined),
    rule('R13', null, !(measures.faceCount >= 2 && measures.faceAmbiguous && history.multiMs >= zenConfig.multiHoldMs), measures.faceCount),
  ];
  softenR11(results, history);
  return results;
}

function softenR11(results: RuleResult[], history: RuleHistory): void {
  const r11 = results.find((item) => item.id === 'R11');
  if (!r11 || r11.pass !== false || history.r11OnlyMs < zenConfig.r11GraceMs) return;
  const others = results.filter((item) => item.chip && item.id !== 'R11');
  if (others.some((item) => item.pass === false)) return;
  r11.pass = true;
  r11.deviation = 0;
}

export function advanceHistory(history: RuleHistory, measures: PoseMeasures, results: RuleResult[], elapsedMs: number): RuleHistory {
  const dt = Math.max(0, elapsedMs);
  const r11 = results.find((item) => item.id === 'R11');
  const onlyR11 = r11?.pass === false && results.every((item) => !item.chip || item.id === 'R11' || item.pass !== false);
  const multi = measures.faceCount >= 2 && measures.faceAmbiguous;
  return {
    maxNeckRatio: Math.max(history.maxNeckRatio, measures.neckRatio ?? 0),
    r11OnlyMs: onlyR11 ? history.r11OnlyMs + dt : 0,
    multiMs: multi ? history.multiMs + dt : 0,
  };
}

export function liveRules(measures: PoseMeasures, baseline: PoseBaseline, mode: PoseMode): RuleResult[] {
  const live = mode === 'stand' ? zenConfig.live : zenConfig.live;
  const neck = ratioBelow(measures.neckRatio, baseline.neckRatio, live.neckOfBase);
  const lean = ratioAbove(measures.faceShoulderRatio, baseline.faceShoulderRatio, live.faceShoulderOfBase);
  const close = ratioAbove(measures.faceWidthShare, baseline.faceWidth, live.faceCloseOfBase);
  const far = ratioBelow(measures.faceWidthShare, baseline.faceWidth, live.faceFarOfBase);
  const tiltDelta = delta(measures.shoulderTiltDeg, baseline.shoulderRollDeg);
  const rollDelta = delta(measures.headRollDeg, baseline.headRollDeg);
  const drop = measures.shoulderMidY === null ? null : measures.shoulderMidY - baseline.shoulderMidY;
  const offset = measures.noseOffset === null ? null : measures.noseOffset - baseline.noseOffset;
  const pitch = measures.pitchDeg === null || baseline.pitchDeg === undefined ? null : measures.pitchDeg - baseline.pitchDeg;
  return [
    rule('L-neck', 'tall', neck.pass, measures.neckRatio, neck.deviation),
    rule('L-face', 'tall', lean.pass, measures.faceShoulderRatio, lean.deviation, lean.pass === false ? 'close' : undefined),
    rule('L-close', 'distance', close.pass, measures.faceWidthShare, close.deviation, close.pass === false ? 'close' : undefined),
    rule('L-far', 'distance', far.pass, measures.faceWidthShare, far.deviation, far.pass === false ? 'far' : undefined),
    rule('L-tilt', 'shoulders', tiltDelta === null ? null : Math.abs(tiltDelta) <= live.tiltDeg, measures.shoulderTiltDeg, tiltDelta === null ? 0 : Math.max(0, Math.abs(tiltDelta) - live.tiltDeg) / live.tiltDeg),
    rule('L-roll', 'head', rollDelta === null ? null : Math.abs(rollDelta) <= live.rollDeg, measures.headRollDeg, rollDelta === null ? 0 : Math.max(0, Math.abs(rollDelta) - live.rollDeg) / live.rollDeg),
    rule('L-drop', 'tall', drop === null ? null : drop <= live.shoulderDrop, measures.shoulderMidY, drop === null ? 0 : Math.max(0, drop - live.shoulderDrop) / live.shoulderDrop),
    rule('L-offset', 'head', offset === null ? null : offset <= live.noseOffset, measures.noseOffset, offset === null ? 0 : Math.max(0, offset - live.noseOffset) / live.noseOffset),
    rule('L-pitch', 'head', pitch === null ? null : pitch >= -live.pitchDownDeg, measures.pitchDeg, pitch === null ? 0 : Math.max(0, -live.pitchDownDeg - pitch) / live.pitchDownDeg),
  ];
}

function delta(value: number | null, base: number | undefined): number | null {
  if (value === null || base === undefined || !Number.isFinite(base)) return null;
  return value - base;
}

function ratioBelow(value: number | null, base: number, line: number): { pass: boolean | null; deviation: number } {
  if (value === null || !(base > 0)) return { pass: null, deviation: 0 };
  const floor = line * base;
  return value < floor ? { pass: false, deviation: (floor - value) / base } : { pass: true, deviation: 0 };
}

function ratioAbove(value: number | null, base: number, line: number): { pass: boolean | null; deviation: number } {
  if (value === null || !(base > 0)) return { pass: null, deviation: 0 };
  const ceiling = line * base;
  return value > ceiling ? { pass: false, deviation: (value - ceiling) / base } : { pass: true, deviation: 0 };
}

export function chipFor(ruleId: string): ChipId | null {
  if (ruleId === 'R2' || ruleId === 'R3' || ruleId === 'R4' || ruleId === 'R5' || ruleId === 'R6' || ruleId === 'L-roll' || ruleId === 'L-offset' || ruleId === 'L-pitch') return 'head';
  if (ruleId === 'R7' || ruleId === 'R8' || ruleId === 'R9' || ruleId === 'L-tilt') return 'shoulders';
  if (ruleId === 'R10' || ruleId === 'R11' || ruleId === 'L-neck' || ruleId === 'L-face' || ruleId === 'L-drop') return 'tall';
  if (ruleId === 'R12' || ruleId === 'R12b' || ruleId === 'R12c' || ruleId === 'L-close' || ruleId === 'L-far') return 'distance';
  return null;
}

export function chipPassing(results: readonly RuleResult[], chip: ChipId): boolean {
  const mine = results.filter((item) => item.chip === chip && item.pass !== null);
  return mine.length > 0 && mine.every((item) => item.pass === true);
}

export function tipFor(result: RuleResult, mirrored: boolean, mode: PoseMode = 'sit'): CoachCopy {
  const tall = mode === 'stand' ? 'Stand tall' : 'Sit tall';
  if (result.id === 'R2') {
    const moveLeft = mirrored ? result.issue === 'camera-left' : result.issue === 'camera-right';
    return { title: moveLeft ? 'Move a little left' : 'Move a little right', helper: 'Center your face in the brackets.' };
  }
  if (result.id === 'R3') {
    return { title: result.issue === 'low' ? 'Lower your screen a little' : 'Raise your screen a little', helper: 'Line your eyes up with the dotted line.' };
  }
  if (result.id === 'R4' || result.id === 'L-roll') return { title: 'Straighten your head', helper: 'Keep your eyes level.' };
  if (result.id === 'R5') return { title: 'Face the screen', helper: 'Look straight at the camera.' };
  if (result.id === 'R6') return { title: 'Chin level', helper: 'Eyes straight ahead, not up or down.' };
  if (result.id === 'R12c') return { title: 'Sit back a little', helper: 'So both shoulders fit in the picture.' };
  if (result.id === 'R7') return { title: 'Show both shoulders', helper: 'Lean back a little or tilt your screen down.' };
  if (result.id === 'R8') return { title: 'Drop and level your shoulders', helper: 'Let them sink away from your ears.' };
  if (result.id === 'L-tilt') return { title: 'Level your shoulders', helper: 'Let both sink away from your ears.' };
  if (result.id === 'R9' || result.id === 'L-offset') return { title: result.id === 'R9' ? 'Center your body' : 'Center your head over your shoulders', helper: result.id === 'R9' ? 'Head right over your shoulders.' : 'Shift a little left/right.' };
  if (result.id === 'R10' || result.id === 'R11' || result.id === 'L-neck' || result.id === 'L-drop') return { title: tall, helper: 'Lift your chest a little, chin level.' };
  if (result.id === 'L-face') {
    return { title: mode === 'stand' ? 'Stand back into your outline' : 'Sit back into your outline', helper: 'Chin level, shoulders down.' };
  }
  if (result.id === 'L-pitch') return { title: 'Chin level, eyes up', helper: 'Bring your eyes back to the screen.' };
  if (result.issue === 'close' || result.id === 'L-close') return { title: 'Move back a little', helper: 'About an arm\'s length from the screen.' };
  if (result.issue === 'far' || result.id === 'L-far') return { title: 'Come a little closer', helper: 'About an arm\'s length from the screen.' };
  return OPENING;
}

export function activeTip(results: readonly RuleResult[], chip: ChipId | null, mirrored: boolean, mode: PoseMode): CoachCopy | null {
  if (!chip) return null;
  const failing = results.find((item) => item.chip === chip && item.pass === false);
  return failing ? tipFor(failing, mirrored, mode) : null;
}

export function worstLiveRule(results: readonly RuleResult[]): RuleResult | null {
  let worst: RuleResult | null = null;
  for (const item of results) {
    if (item.pass !== false) continue;
    if (!worst || item.deviation > worst.deviation) worst = item;
  }
  return worst;
}

export type CalloutId = 'eyes' | 'ears' | 'shoulders' | 'screen';

export function calloutForChip(chip: ChipId | null): CalloutId | null {
  if (chip === 'head') return 'eyes';
  if (chip === 'shoulders') return 'shoulders';
  if (chip === 'tall') return 'ears';
  if (chip === 'distance') return 'screen';
  return null;
}

export function calloutForRule(result: RuleResult | null): CalloutId | null {
  if (!result || result.pass !== false) return null;
  return calloutForChip(result.chip);
}

export function chipLabel(id: ChipId, mode: PoseMode): string {
  if (id === 'head') return 'Head';
  if (id === 'shoulders') return 'Shoulders';
  if (id === 'tall') return mode === 'stand' ? 'Stand tall' : 'Sit tall';
  return 'Distance';
}

export function openingCopy(): CoachCopy {
  return OPENING;
}

export interface SnapProblem {
  title: string;
  helper: string;
  allowAnyway: boolean;
}

export function snapshotProblem(results: readonly RuleResult[], outlineReason: 'ok' | 'trace-failed' | 'shoulder-cut', mirrored: boolean): SnapProblem | null {
  const fail = (id: string) => results.find((item) => item.id === id && item.pass === false);
  const shoulder = fail('R7');
  if (outlineReason === 'shoulder-cut' || fail('R12c')) {
    return { title: 'A shoulder is cut off', helper: 'Sit back a little so both shoulders fit, then retake.', allowAnyway: false };
  }
  if (shoulder) {
    return { title: 'A shoulder is cut off', helper: 'Move back a little or center yourself, then retake.', allowAnyway: false };
  }
  const center = fail('R2');
  if (center) {
    const copy = tipFor(center, mirrored, 'sit');
    const way = copy.title.includes('left') ? 'left' : 'right';
    return { title: "You're a bit off-center", helper: `Move a little ${way}, then retake.`, allowAnyway: true };
  }
  const distance = fail('R12') ?? fail('R12b');
  if (distance?.issue === 'far') return { title: "You're a bit far away", helper: "Come a little closer, about an arm's length.", allowAnyway: true };
  if (distance?.issue === 'close') return { title: "You're a bit close", helper: "Move back a little, about an arm's length.", allowAnyway: true };
  if (fail('R8') || fail('R9') || fail('R4')) {
    return { title: "You're leaning a little", helper: 'Sit centered with level shoulders, then retake.', allowAnyway: true };
  }
  if (outlineReason === 'trace-failed') {
    return { title: "I couldn't trace your outline", helper: 'Try more light on your face and a plain background, then retake.', allowAnyway: false };
  }
  return null;
}

export function baselineFromMeasures(measures: PoseMeasures): PoseBaseline | null {
  if (
    measures.shoulderMidX === null ||
    measures.shoulderMidY === null ||
    measures.shoulderWidth === null ||
    measures.faceWidth === null ||
    measures.noseOffset === null ||
    measures.neckRatio === null ||
    measures.faceShoulderRatio === null ||
    measures.shoulderTiltDeg === null ||
    measures.headRollDeg === null ||
    measures.eyeMidY === null
  ) {
    return null;
  }
  return {
    shoulderMidX: measures.shoulderMidX,
    shoulderMidY: measures.shoulderMidY,
    shoulderWidth: measures.shoulderWidth,
    faceWidth: measures.faceWidth,
    noseOffset: measures.noseOffset,
    neckRatio: measures.neckRatio,
    faceShoulderRatio: measures.faceShoulderRatio,
    shoulderRollDeg: measures.shoulderTiltDeg,
    headRollDeg: measures.headRollDeg,
    eyeLineY: measures.eyeMidY,
    pitchDeg: measures.pitchDeg ?? undefined,
    yawDeg: measures.yawDeg ?? undefined,
    distanceIn: measures.distanceIn ?? undefined,
  };
}

export function medianBaseline(samples: readonly PoseBaseline[]): PoseBaseline | null {
  if (samples.length === 0) return null;
  const pick = (read: (item: PoseBaseline) => number) => median(samples.map(read));
  const optional = (read: (item: PoseBaseline) => number | undefined) => {
    const values = samples.map(read).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length > 0 ? median(values) : undefined;
  };
  return {
    shoulderMidX: pick((item) => item.shoulderMidX),
    shoulderMidY: pick((item) => item.shoulderMidY),
    shoulderWidth: pick((item) => item.shoulderWidth),
    faceWidth: pick((item) => item.faceWidth),
    noseOffset: pick((item) => item.noseOffset),
    neckRatio: pick((item) => item.neckRatio),
    faceShoulderRatio: pick((item) => item.faceShoulderRatio),
    shoulderRollDeg: pick((item) => item.shoulderRollDeg),
    headRollDeg: pick((item) => item.headRollDeg),
    eyeLineY: pick((item) => item.eyeLineY),
    pitchDeg: optional((item) => item.pitchDeg),
    yawDeg: optional((item) => item.yawDeg),
    distanceIn: optional((item) => item.distanceIn),
  };
}

export function rememberMeasures(buffer: readonly PoseMeasures[], next: PoseMeasures, keep = zenConfig.measureWindow): PoseMeasures[] {
  return [...buffer, next].slice(-keep);
}

export function medianMeasures(buffer: readonly PoseMeasures[]): PoseMeasures | null {
  const current = buffer[buffer.length - 1];
  if (!current) return null;
  const numeric = (read: (item: PoseMeasures) => number | null) => {
    const values = buffer.map(read).filter((value): value is number => value !== null && Number.isFinite(value));
    return values.length > 0 ? median(values) : null;
  };
  return {
    ...current,
    present: buffer.filter((item) => item.present).length * 2 >= buffer.length,
    shouldersVisible: buffer.filter((item) => item.shouldersVisible).length * 2 >= buffer.length,
    eyeMidX: numeric((item) => item.eyeMidX),
    eyeMidY: numeric((item) => item.eyeMidY),
    headRollDeg: numeric((item) => item.headRollDeg),
    yawDeg: numeric((item) => item.yawDeg),
    pitchDeg: numeric((item) => item.pitchDeg),
    shoulderTiltDeg: numeric((item) => item.shoulderTiltDeg),
    noseOffset: numeric((item) => item.noseOffset),
    neckRatio: numeric((item) => item.neckRatio),
    faceShoulderRatio: numeric((item) => item.faceShoulderRatio),
    faceWidthShare: numeric((item) => item.faceWidthShare),
    distanceIn: numeric((item) => item.distanceIn),
    shoulderMidX: numeric((item) => item.shoulderMidX),
    shoulderMidY: numeric((item) => item.shoulderMidY),
    shoulderWidth: numeric((item) => item.shoulderWidth),
    faceWidth: numeric((item) => item.faceWidth),
    noseX: numeric((item) => item.noseX),
    noseY: numeric((item) => item.noseY),
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

export function rulesRecord(results: readonly RuleResult[]): Record<string, { value: number | null; pass: boolean }> {
  const record: Record<string, { value: number | null; pass: boolean }> = {};
  for (const item of results) record[item.id] = { value: item.value, pass: item.pass === true };
  return record;
}

export function liveTip(result: RuleResult | null, mode: PoseMode): CoachCopy {
  if (!result) {
    return { title: mode === 'stand' ? 'Stand back into your outline' : 'Sit back into your outline', helper: 'Chin level, shoulders down.' };
  }
  return tipFor(result, true, mode);
}

export const FIT_DEFAULT: CoachCopy = {
  title: 'Ease your head back into your outline',
  helper: 'Fit your shape and hold still for 3 seconds.',
};

export function orderedChips(): readonly ChipId[] {
  return CHIP_ORDER;
}
