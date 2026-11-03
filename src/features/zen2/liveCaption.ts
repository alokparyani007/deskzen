import type { NormPoint } from '../../lib/posture/types';
import { zenConfig, type PoseMode } from './zenConfig';
import type { CoachPhase } from './liveCoach2';
import { liveTip, type RuleResult } from './poseRules';

export const ON_TRACK_CAPTION = "Nice, you're in your Zen";

export type TrackKind = 'ontrack' | 'drifting';

export interface TrackClock {
  kind: TrackKind;
  since: number;
}

/**
 * Which of the person's own shoulders rose more than `limitDeg` past the saved line.
 * MediaPipe left/right are the person's shoulders. The preview is mirrored on x only,
 * so those names already match the side the user sees. Compare y, not screen x.
 * Positive tilt means the right shoulder sits lower.
 */
export function raisedShoulder(
  liveLeft: NormPoint | null,
  liveRight: NormPoint | null,
  savedLeft: NormPoint | null,
  savedRight: NormPoint | null,
  limitDeg = zenConfig.live.tiltDeg,
): 'left' | 'right' | null {
  if (!liveLeft || !liveRight || !savedLeft || !savedRight) return null;
  const live = shoulderTiltDeg(liveLeft, liveRight);
  const saved = shoulderTiltDeg(savedLeft, savedRight);
  if (live === null || saved === null) return null;
  const delta = live - saved;
  if (delta > limitDeg) return 'left';
  if (delta < -limitDeg) return 'right';
  return null;
}

export function shoulderCaption(side: 'left' | 'right'): string {
  return side === 'right' ? 'Relax your right shoulder down' : 'Relax your left shoulder down';
}

/** One short line for the live pill. Shoulder side wins only when it is the tip. */
export function liveCaption(result: RuleResult | null, mode: PoseMode, shoulder: 'left' | 'right' | null): string {
  if (shoulder && (!result || result.id === 'L-tilt')) return shoulderCaption(shoulder);
  if (result?.id === 'L-neck' || result?.id === 'L-drop') {
    return mode === 'stand' ? 'Stand tall, lift your head back up' : 'Sit tall, lift your head back up';
  }
  if (!result) return mode === 'stand' ? 'Stand back into your outline' : 'Sit back into your outline';
  return liveTip(result, mode).title;
}

export function coachCaption(input: {
  away: boolean;
  drifting: boolean;
  guiding: boolean;
  mode: PoseMode;
  worst: RuleResult | null;
  shoulder: 'left' | 'right' | null;
}): { text: string; loud: boolean } {
  if (input.away) return { text: 'Step into view', loud: true };
  if (input.shoulder && (!input.worst || input.worst.id === 'L-tilt')) {
    return { text: shoulderCaption(input.shoulder), loud: true };
  }
  if (input.drifting || input.guiding || input.shoulder) {
    return { text: liveCaption(input.worst, input.mode, input.shoulder), loud: true };
  }
  return { text: ON_TRACK_CAPTION, loud: false };
}

export function trackKind(phase: CoachPhase, shoulderRaised: boolean, away: boolean): TrackKind | null {
  if (away || phase === 'away') return null;
  if (phase === 'drifting' || shoulderRaised) return 'drifting';
  return 'ontrack';
}

export function formatTrackLabel(kind: TrackKind, elapsedMs: number): string {
  const elapsed = Math.max(0, elapsedMs);
  if (kind === 'drifting') return `Drifting · ${Math.floor(elapsed / 1000)} s`;
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return `On track · ${seconds} s`;
  return `On track · ${Math.floor(seconds / 60)} min`;
}

export function stepTrackClock(clock: TrackClock | null, kind: TrackKind | null, now: number): { clock: TrackClock | null; label: string | null } {
  if (kind === null) return { clock: null, label: null };
  const next = clock && clock.kind === kind ? clock : { kind, since: now };
  return { clock: next, label: formatTrackLabel(kind, now - next.since) };
}

/** Highest outline point (smallest y). Used to park the drift arrow above the hair. */
export function highestPoint(points: readonly NormPoint[] | null | undefined): NormPoint | null {
  if (!points || points.length === 0) return null;
  let top = points[0]!;
  for (const point of points) if (point.y < top.y) top = point;
  return top;
}

function shoulderTiltDeg(left: NormPoint, right: NormPoint): number | null {
  const span = Math.abs(right.x - left.x);
  if (span < 1e-6) return null;
  return (Math.atan2(right.y - left.y, span) * 180) / Math.PI;
}
