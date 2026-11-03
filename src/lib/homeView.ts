import { labelFor, labelText } from './posture/score';
import { aggregateDays, formatDuration, type DayCounts, type MinuteRecord } from './progress/aggregate';
import type { HomeSnapshot } from './home';

export interface HomeView extends HomeSnapshot {
  empty: boolean;
  postureLabel: string;
  breakDue: boolean;
  cameraLive: boolean;
}

export function buildHomeSnapshot(input: {
  name: string;
  minutes: readonly MinuteRecord[];
  counts: readonly DayCounts[];
  nowMs: number;
  timeZone: string;
  liveScore: number | null;
  liveLabel: string | null;
  presenceMs: number;
  breakDue: boolean;
  cameraLive: boolean;
}): HomeView {
  const week = aggregateDays(input.minutes, input.counts, input.nowMs, input.timeZone, 7);
  const today = week[week.length - 1];
  const tracked = today?.trackedMinutes ?? 0;
  const average = today?.average ?? null;
  const live = input.liveScore;
  const score = average ?? live ?? 0;
  const empty = tracked < 5 && live === null;
  return {
    name: input.name,
    score,
    scoreLabel: labelText(labelFor(score)),
    scoreNote: tracked >= 5 ? 'Today' : 'Live',
    postureLabel: input.liveLabel ?? (average === null ? 'Settle in' : labelText(labelFor(average))),
    sittingLabel: formatDuration(today?.sittingWellMinutes ?? 0),
    breaks: today?.breaks ?? 0,
    waterCups: today?.water ?? 0,
    sittingMinutes: Math.max(0, Math.round(input.presenceMs / 60_000)),
    weekly: week.map((day) => ({ day: day.label, score: Math.round(day.average ?? 0) })),
    empty,
    breakDue: input.breakDue,
    cameraLive: input.cameraLive,
  };
}
