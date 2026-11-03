import type { ReminderKind, RhythmDot } from '../wellness/rhythm';
import { formatMinute } from '../wellness/rhythm';
import { reminderTiming } from './config';
import { DAY_MINUTES, reminderName } from './plan';

/**
 * 24-hour dial math. 12 AM sits at the bottom and 12 PM at the top, and time
 * runs clockwise, so 6 AM is on the left and 6 PM on the right.
 */
export function minuteToAngle(minute: number): number {
  const degrees = (minute / DAY_MINUTES) * 360 + 180;
  return ((degrees % 360) + 360) % 360;
}

export function pointAt(minute: number, radius: number, cx: number, cy: number): { x: number; y: number } {
  const radians = (minuteToAngle(minute) * Math.PI) / 180;
  return { x: round(cx + radius * Math.sin(radians)), y: round(cy - radius * Math.cos(radians)) };
}

/** SVG path for the arc from one time to another, clockwise. Wraps past midnight. */
export function arcPath(startMin: number, endMin: number, radius: number, cx: number, cy: number): string {
  let span = endMin - startMin;
  if (span <= 0) span += DAY_MINUTES;
  if (span >= DAY_MINUTES) span = DAY_MINUTES - 0.5;
  const from = pointAt(startMin, radius, cx, cy);
  const to = pointAt(startMin + span, radius, cx, cy);
  const large = span > DAY_MINUTES / 2 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y}`;
}

export interface DialMark {
  minute: number;
  kinds: ReminderKind[];
  count: number;
  /** A single reminder in the next 2 hours. */
  solo: boolean;
  label: string;
}

/**
 * Keeps the dial clean. Reminders in the next 2 hours get their own dot, and
 * ones closer than 15 minutes share a dot. Later reminders become one small
 * dot per hour. Frequent spot checks never crowd the ring.
 */
export function clusterMarks(
  dots: readonly RhythmDot[],
  nowMin: number,
  options: { soloWindowMin?: number; mergeMin?: number; bucketMin?: number } = {},
): DialMark[] {
  const soloWindow = options.soloWindowMin ?? reminderTiming.soloWindowMin;
  const mergeMin = options.mergeMin ?? reminderTiming.mergeMin;
  const bucketMin = options.bucketMin ?? reminderTiming.bucketMin;
  const sorted = [...dots].sort((a, b) => a.minute - b.minute);
  const marks: DialMark[] = [];
  let group: RhythmDot[] = [];
  let groupKey: string | null = null;

  const flush = () => {
    if (group.length === 0) return;
    const kinds = [...new Set(group.map((dot) => dot.kind))];
    const first = group[0]!;
    const near = first.minute < nowMin + soloWindow;
    const label =
      group.length === 1
        ? `${first.label} at ${formatMinute(first.minute)}`
        : `${group.length} reminders from ${formatMinute(first.minute)}: ${kinds.map(reminderName).join(', ')}`;
    marks.push({ minute: near ? first.minute : bucketCenter(first.minute, nowMin, soloWindow, bucketMin), kinds, count: group.length, solo: near && group.length === 1, label });
    group = [];
    groupKey = null;
  };

  for (const dot of sorted) {
    const near = dot.minute < nowMin + soloWindow;
    const key = near ? `near` : `far-${Math.floor((dot.minute - nowMin - soloWindow) / bucketMin)}`;
    const fits = groupKey === key && (!near || dot.minute - group[0]!.minute < mergeMin);
    if (!fits) flush();
    group.push(dot);
    groupKey = key;
  }
  flush();
  return marks;
}

function bucketCenter(minute: number, nowMin: number, soloWindow: number, bucketMin: number): number {
  const index = Math.floor((minute - nowMin - soloWindow) / bucketMin);
  return nowMin + soloWindow + index * bucketMin + bucketMin / 2;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
