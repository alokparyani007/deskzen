import { slouchAmount } from '../../calibration/catchMe';
import { calibrationConfig } from '../../calibration/config';
import { extractFeatures } from '../../calibration/features';
import type { LockedPose } from '../../calibration/lockedPose';
import type { PosturePrint } from '../../calibration/print';
import { localDayKey, migrateMinute, type MinuteRecord } from '../../lib/progress/aggregate';
import { postureConfig } from '../../lib/posture/config';
import { screenDistanceIn, tiltFromHorizontalDeg } from '../../lib/posture/signals';
import { silhouetteIsUsable } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { frameStatus } from './frame';

export type CoachDrift =
  | 'head-forward'
  | 'head-down'
  | 'slouch'
  | 'lean-left'
  | 'lean-right'
  | 'shoulders-tilt'
  | 'shoulders-up'
  | 'too-close'
  | 'too-far'
  | 'out-of-frame'
  | 'chin-slouch';

export interface TipCopy {
  title: string;
  helper: string;
}

const RELAX = 'Let your shoulders relax over your hips';
const HOLD_MS = 4_000;
const TIP_GAP_MS = 20_000;
const SAME_TIP_MS = 60_000;
const NICE_GAP_MS = 60_000;
const BAND_HOLD_MS = 1_500;

export const ZEN_TITLE = "Nice! That's your Zen";
export const RECOVERY_LINE = "Nice, that's it";

export function tipFor(drift: CoachDrift): TipCopy {
  switch (drift) {
    case 'head-forward':
    case 'slouch':
    case 'chin-slouch':
      return { title: 'Sit back about 2 inches', helper: RELAX };
    case 'head-down':
      return { title: 'Lift your chin a little', helper: 'Easy, so your ears sit over your shoulders.' };
    case 'lean-left':
      return { title: 'Center yourself', helper: 'Shift a little to the left.' };
    case 'lean-right':
      return { title: 'Center yourself', helper: 'Shift a little to the right.' };
    case 'shoulders-tilt':
      return { title: 'Level your shoulders', helper: 'Even them out, nice and easy.' };
    case 'shoulders-up':
      return { title: 'Drop your shoulders', helper: 'Let them fall away from your ears.' };
    case 'too-close':
      return { title: 'Move back from the screen', helper: 'A little more room helps you sit tall.' };
    case 'too-far':
      return { title: 'Move a little closer', helper: RELAX };
    case 'out-of-frame':
      return { title: 'Step into view', helper: 'Sit where the camera can see your head and shoulders.' };
  }
}

export function zenHelper(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  if (minutes >= 1) return `Tall for ${minutes} minute${minutes === 1 ? '' : 's'}. Keep it easy.`;
  return `Tall for ${total} seconds. Keep it easy.`;
}

export interface CoachMemory {
  tip: CoachDrift | null;
  tipSince: number;
  wasDrifting: boolean;
  tallSince: number | null;
}

export interface CoachChip {
  title: string;
  helper: string;
  tone: 'drift' | 'zen';
  drift: CoachDrift | null;
}

export function emptyCoach(): CoachMemory {
  return { tip: null, tipSince: 0, wasDrifting: false, tallSince: null };
}

export function rankDrifts(samples: { id: CoachDrift; amount: number }[]): CoachDrift | null {
  const ranked = [...samples].sort((a, b) => b.amount - a.amount);
  const top = ranked[0];
  if (!top || top.amount < 1) return null;
  return top.id;
}

/** Head forward and a slouch together become one tip, instead of flipping between them. */
export function chooseDrift(samples: { id: CoachDrift; amount: number }[]): CoachDrift | null {
  const head = samples.find((sample) => sample.id === 'head-forward')?.amount ?? 0;
  const slouch = samples.find((sample) => sample.id === 'slouch')?.amount ?? 0;
  const rest = samples.filter((sample) => sample.id !== 'head-forward' && sample.id !== 'slouch');
  if (head >= 1 && slouch >= 1) rest.push({ id: 'chin-slouch', amount: Math.max(head, slouch) });
  else {
    if (head > 0) rest.push({ id: 'head-forward', amount: head });
    if (slouch > 0) rest.push({ id: 'slouch', amount: slouch });
  }
  return rankDrifts(rest);
}

/** Screen direction in the mirrored preview. Positive means the outline sits to the viewer's right. */
export function leanDirection(liveNoseX: number, liveShoulderX: number, savedNoseX: number, savedShoulderX: number): 'left' | 'right' {
  const delta = savedNoseX - savedShoulderX - (liveNoseX - liveShoulderX);
  return delta >= 0 ? 'right' : 'left';
}

export interface DriftAmounts {
  headForward: number;
  headDown: number;
  shouldersUp: number;
  shouldersTilt: number;
  lean: number;
  leanSide: 'lean-left' | 'lean-right';
  tooClose: number;
  tooFar: number;
  slouch: number;
}

export function readDrifts(frame: Landmarks, print: PosturePrint): { drift: CoachDrift | null; amounts: DriftAmounts } {
  const features = extractFeatures({ landmarks: frame, pitchDeg: frame.pitchDeg }).internal;
  const base = print.anchor.values;
  const floor = calibrationConfig.floor;
  const side = sideDrift(frame, print.lockedPose);
  const close = tooClose(frame, print);
  const far = tooFar(frame, print);
  const leanIn = higher(features.leanIn, base.leanIn, floor.leanIn);
  const amounts: DriftAmounts = {
    headForward: lower(features.headDrop, base.headDrop, floor.headDrop),
    headDown: frame.pitchDeg !== undefined && frame.pitchDeg > 0 ? frame.pitchDeg / 8 : 0,
    shouldersUp: lower(features.shrug, base.shrug, floor.shrug),
    shouldersTilt: shoulderTilt(frame) / 6,
    lean: side.amount,
    leanSide: side.id,
    tooClose: Math.max(close, leanIn),
    tooFar: far,
    slouch: slouchAmount(frame, print.anchor),
  };
  return {
    amounts,
    drift: chooseDrift([
      { id: 'head-forward', amount: amounts.headForward },
      { id: 'head-down', amount: amounts.headDown },
      { id: 'shoulders-up', amount: amounts.shouldersUp },
      { id: 'shoulders-tilt', amount: amounts.shouldersTilt },
      { id: amounts.leanSide, amount: amounts.lean },
      amounts.tooClose >= amounts.tooFar ? { id: 'too-close', amount: amounts.tooClose } : { id: 'too-far', amount: amounts.tooFar },
      { id: 'slouch', amount: amounts.slouch },
    ]),
  };
}

/** True when the person is not ready to score. Estimated shoulders still count as in frame. */
export function frameMissing(frame: Landmarks | null): boolean {
  return frameStatus(frame).status !== 'ok';
}

export function measureDrifts(frame: Landmarks, print: PosturePrint): CoachDrift | null {
  return readDrifts(frame, print).drift;
}

export function stepCoach(memory: CoachMemory, now: number, drift: CoachDrift | null): { memory: CoachMemory; chip: CoachChip; recovered: boolean } {
  if (drift === 'out-of-frame') {
    const same = memory.tip === 'out-of-frame';
    return {
      memory: { ...memory, tip: 'out-of-frame', tipSince: same ? memory.tipSince : now, wasDrifting: true, tallSince: null },
      chip: driftChip('out-of-frame'),
      recovered: false,
    };
  }
  if (drift) {
    const held = memory.tip !== null && memory.tip !== 'out-of-frame' && now - memory.tipSince < HOLD_MS;
    const tip = held && memory.tip ? memory.tip : drift;
    return {
      memory: { ...memory, tip, tipSince: tip === memory.tip ? memory.tipSince : now, wasDrifting: true, tallSince: null },
      chip: driftChip(tip),
      recovered: false,
    };
  }
  const tallSince = memory.tallSince ?? now;
  return {
    memory: { ...memory, tip: null, wasDrifting: false, tallSince },
    chip: { title: ZEN_TITLE, helper: zenHelper(now - tallSince), tone: 'zen', drift: null },
    recovered: memory.wasDrifting,
  };
}

export function formatTall(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export type MatchBand = 'good' | 'mid' | 'low';

export function matchBand(score: number): MatchBand {
  if (score >= 90) return 'good';
  if (score >= 70) return 'mid';
  return 'low';
}

export interface BandMemory {
  shown: MatchBand;
  pending: MatchBand | null;
  pendingSince: number;
}

export function emptyBand(score: number): BandMemory {
  return { shown: matchBand(score), pending: null, pendingSince: 0 };
}

/** Stay in the current color until the new one has held for 1.5s. */
export function stepBand(memory: BandMemory, now: number, score: number, holdMs = BAND_HOLD_MS): { memory: BandMemory; band: MatchBand } {
  const next = matchBand(score);
  if (next === memory.shown) {
    if (memory.pending === null) return { memory, band: memory.shown };
    return { memory: { ...memory, pending: null, pendingSince: 0 }, band: memory.shown };
  }
  if (memory.pending !== next) return { memory: { ...memory, pending: next, pendingSince: now }, band: memory.shown };
  if (now - memory.pendingSince >= holdMs) return { memory: { shown: next, pending: null, pendingSince: 0 }, band: next };
  return { memory, band: memory.shown };
}

export function smoothScore(previous: number | null, next: number, alpha = 0.2): number {
  if (previous === null || !Number.isFinite(previous)) return next;
  return previous + alpha * (next - previous);
}

export function wholePercent(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface VoiceState {
  spokenAt: number;
  tip: string | null;
  tipAt: number;
  niceAt: number;
  busy: boolean;
}

export function emptyVoice(): VoiceState {
  return { spokenAt: Number.NEGATIVE_INFINITY, tip: null, tipAt: Number.NEGATIVE_INFINITY, niceAt: Number.NEGATIVE_INFINITY, busy: false };
}

export const FIRST_TIP_MS = 3_000;
export const LIVE_HELLO = "I'll keep an eye on you. Match the green outline.";

/** First spoken tip waits 3 seconds. Guide me back silences every other line. */
export function gateCoachVoice(
  state: VoiceState,
  now: number,
  input: { guiding: boolean; text: string | null; kind: 'tip' | 'nice'; driftMs: number },
): { state: VoiceState; speak: string | null } {
  if (input.guiding || !input.text) return { state, speak: null };
  if (input.kind === 'tip' && input.driftMs < FIRST_TIP_MS) return { state, speak: null };
  return nextVoice(state, now, { text: input.text, kind: input.kind });
}

export function nextVoice(
  state: VoiceState,
  now: number,
  request: { text: string; kind: 'tip' | 'nice' } | null,
): { state: VoiceState; speak: string | null } {
  if (!request || state.busy) return { state, speak: null };
  if (request.kind === 'nice') {
    if (now - state.niceAt < NICE_GAP_MS) return { state, speak: null };
    return { state: { ...state, niceAt: now, spokenAt: now, busy: true }, speak: RECOVERY_LINE };
  }
  if (now - state.spokenAt < TIP_GAP_MS) return { state, speak: null };
  if (request.text === state.tip && now - state.tipAt < SAME_TIP_MS) return { state, speak: null };
  return { state: { ...state, spokenAt: now, tip: request.text, tipAt: now, busy: true }, speak: request.text };
}

export type OutlineKind = 'silhouette' | 'locked' | 'generic';

export function outlineKind(input: { hasPrint: boolean; silhouette: { points: { x: number; y: number }[] } | null | undefined; hasLockedPose: boolean }): OutlineKind {
  if (!input.hasPrint) return 'generic';
  if (silhouetteIsUsable(input.silhouette)) return 'silhouette';
  if (input.hasLockedPose) return 'locked';
  return 'generic';
}

export interface BodyRow {
  id: 'head' | 'tall' | 'shoulders' | 'distance';
  label: string;
  state: 'ok' | 'fix' | 'wait';
  estimated?: boolean;
}

const BODY_ROWS: readonly { id: BodyRow['id']; label: string }[] = [
  { id: 'head', label: 'Head over shoulders' },
  { id: 'tall', label: 'Sitting tall' },
  { id: 'shoulders', label: 'Shoulders level' },
  { id: 'distance', label: 'Screen distance' },
];

export function bodyCheck(drift: CoachDrift | null, ready: boolean, estimated = false, waiting: string | null = null): BodyRow[] {
  if (waiting) return BODY_ROWS.map((row) => ({ ...row, label: waiting, state: 'wait' }));
  if (!ready || drift === 'out-of-frame') return BODY_ROWS.map((row) => ({ ...row, state: 'wait' }));
  const fix = new Set<BodyRow['id']>();
  if (drift === 'head-forward' || drift === 'head-down' || drift === 'chin-slouch') fix.add('head');
  if (drift === 'slouch' || drift === 'chin-slouch') fix.add('tall');
  if (drift === 'shoulders-up' || drift === 'shoulders-tilt') fix.add('shoulders');
  if (drift === 'too-close' || drift === 'too-far') fix.add('distance');
  return BODY_ROWS.map((row) => ({ ...row, state: fix.has(row.id) ? 'fix' : 'ok', estimated }));
}

export function highlightedRow(drift: CoachDrift | null): BodyRow['id'] | null {
  if (drift === 'head-forward' || drift === 'head-down' || drift === 'chin-slouch') return 'head';
  if (drift === 'slouch') return 'tall';
  if (drift === 'shoulders-up' || drift === 'shoulders-tilt') return 'shoulders';
  if (drift === 'too-close' || drift === 'too-far') return 'distance';
  return null;
}

export function bounceCount(minutes: readonly MinuteRecord[], nowMs: number, timeZone: string): number {
  const today = localDayKey(nowMs, timeZone);
  const rows = minutes
    .filter((item) => localDayKey(item.minute * 60_000, timeZone) === today)
    .map(migrateMinute)
    .sort((a, b) => a.minute - b.minute);
  let count = 0;
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (previous && current && previous.state !== 'great' && current.state === 'great') count += 1;
  }
  return count;
}

function driftChip(drift: CoachDrift): CoachChip {
  const copy = tipFor(drift);
  return { title: copy.title, helper: copy.helper, tone: 'drift', drift };
}

function higher(current: number | undefined, base: number | undefined, floor: number): number {
  if (current === undefined || base === undefined || floor <= 0) return 0;
  return Math.max(0, current - base) / floor;
}

function lower(current: number | undefined, base: number | undefined, floor: number): number {
  if (current === undefined || base === undefined || floor <= 0) return 0;
  return Math.max(0, base - current) / floor;
}

function shoulderTilt(frame: Landmarks): number {
  if (!frame.leftShoulder || !frame.rightShoulder) return 0;
  return Math.abs(tiltFromHorizontalDeg(frame.leftShoulder, frame.rightShoulder));
}

function sideDrift(frame: Landmarks, pose: LockedPose | undefined): { id: 'lean-left' | 'lean-right'; amount: number } {
  const amount = sideLean(frame, pose);
  if (!frame.nose || !frame.leftShoulder || !frame.rightShoulder || !pose || frame.videoWidth <= 0) return { id: 'lean-right', amount };
  const liveNose = 1 - frame.nose.x / frame.videoWidth;
  const liveShoulder = 1 - (frame.leftShoulder.x + frame.rightShoulder.x) / 2 / frame.videoWidth;
  const savedShoulder = (pose.leftShoulder.x + pose.rightShoulder.x) / 2;
  const direction = leanDirection(liveNose, liveShoulder, pose.nose.x, savedShoulder);
  return { id: direction === 'left' ? 'lean-left' : 'lean-right', amount };
}

function sideLean(frame: Landmarks, pose: LockedPose | undefined): number {
  if (!frame.nose || !frame.leftShoulder || !frame.rightShoulder || frame.videoWidth <= 0) return 0;
  const live = Math.abs(frame.nose.x - (frame.leftShoulder.x + frame.rightShoulder.x) / 2) / frame.videoWidth;
  const saved = pose ? Math.abs(pose.nose.x - (pose.leftShoulder.x + pose.rightShoulder.x) / 2) : live;
  return Math.abs(live - saved) / 0.04;
}

function tooClose(frame: Landmarks, print: PosturePrint): number {
  const inches = screenDistanceIn(frame);
  const distance = inches !== undefined && inches < postureConfig.minComfortIn ? (postureConfig.minComfortIn - inches) / 6 : 0;
  const saved = print.lockedPose?.faceWidth ?? 0;
  const live = frame.faceBox?.w ?? 0;
  const face = saved > 0 && live > saved ? (live / saved - 1) / 0.15 : 0;
  return Math.max(distance, face);
}

function tooFar(frame: Landmarks, print: PosturePrint): number {
  const inches = screenDistanceIn(frame);
  const maxIn = postureConfig.calibration.distanceMaxIn;
  const distance = inches !== undefined && inches > maxIn ? (inches - maxIn) / 8 : 0;
  const saved = print.lockedPose?.faceWidth ?? 0;
  const live = frame.faceBox?.w ?? 0;
  const face = saved > 0 && live > 0 && live < saved ? (saved / live - 1) / 0.15 : 0;
  return Math.max(distance, face);
}
