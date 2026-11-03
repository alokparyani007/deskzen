import { postureConfig } from '../posture/config';

export type MinuteState = 'great' | 'drift' | 'slouch';
export type MinuteMode = 'sit' | 'stand';

export interface MinuteRecord {
  minute: number;
  score: number;
  state?: MinuteState;
  mode?: MinuteMode;
}

export interface DayCounts {
  date: string;
  breaks: number;
  water: number;
  stretches?: number;
  eyeBreaks?: number;
  standingMinutes?: number;
}

export interface DayStat {
  date: string;
  label: string;
  average: number | null;
  trackedMinutes: number;
  sittingWellMinutes: number;
  breaks: number;
  water: number;
  counts: boolean;
}

/** Old minutes have no state or mode. Great is 85+, drift is 70+, otherwise slouch. Mode defaults to sitting. */
/** One rule for a streak day: enough tracked minutes and a good average (see postureConfig.streak). */
export function isGoodDay(average: number | null, trackedMinutes: number): boolean {
  return average !== null && trackedMinutes >= postureConfig.streak.minTrackedMinutes && average >= postureConfig.streak.minAverage;
}

export function migrateMinute(record: MinuteRecord): MinuteRecord {
  const state = record.state ?? (record.score >= 85 ? 'great' : record.score >= 70 ? 'drift' : 'slouch');
  return { ...record, state, mode: record.mode ?? 'sit' };
}

export function localDayKey(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochMs));
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function weekdayLabel(epochMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(epochMs));
}

export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  if (hours <= 0) return `${rest}m`;
  return `${hours}h ${rest}m`;
}

export function recentDays(nowMs: number, timeZone: string, count: number): { date: string; sampleMs: number }[] {
  const found: { date: string; sampleMs: number }[] = [];
  const limit = (count + 2) * 26;
  for (let hour = 0; found.length < count && hour < limit; hour += 1) {
    const sampleMs = nowMs - hour * 3_600_000;
    const date = localDayKey(sampleMs, timeZone);
    if (found[0]?.date !== date) found.unshift({ date, sampleMs });
  }
  return found.slice(-count);
}

export function aggregateDays(
  minutes: readonly MinuteRecord[],
  counts: readonly DayCounts[],
  nowMs: number,
  timeZone: string,
  dayCount: number,
): DayStat[] {
  const grouped = new Map<string, number[]>();
  for (const record of minutes) {
    const date = localDayKey(record.minute * 60_000, timeZone);
    const bucket = grouped.get(date);
    if (bucket) bucket.push(record.score);
    else grouped.set(date, [record.score]);
  }
  const countByDate = new Map(counts.map((entry) => [entry.date, entry]));
  return recentDays(nowMs, timeZone, dayCount).map((day) => {
    const scores = grouped.get(day.date) ?? [];
    const trackedMinutes = scores.length;
    const average = trackedMinutes === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / trackedMinutes;
    const sittingWellMinutes = scores.filter((score) => score >= postureConfig.streak.minAverage).length;
    const extra = countByDate.get(day.date);
    const countsForStreak = isGoodDay(average, trackedMinutes);
    return {
      date: day.date,
      label: weekdayLabel(day.sampleMs, timeZone),
      average,
      trackedMinutes,
      sittingWellMinutes,
      breaks: extra?.breaks ?? 0,
      water: extra?.water ?? 0,
      counts: countsForStreak,
    };
  });
}

export function streakStats(days: readonly Pick<DayStat, 'counts'>[]): { current: number; best: number } {
  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    const today = index === days.length - 1;
    if (day.counts) {
      run += 1;
      best = Math.max(best, run);
    } else if (!today) {
      run = 0;
    }
  });

  let current = 0;
  const today = days[days.length - 1];
  const start = today && !today.counts ? days.length - 2 : days.length - 1;
  for (let index = start; index >= 0; index -= 1) {
    const day = days[index];
    if (!day?.counts) break;
    current += 1;
  }
  return { current, best };
}

export function upsertMinute(minutes: readonly MinuteRecord[], record: MinuteRecord): MinuteRecord[] {
  return [...minutes.filter((item) => item.minute !== record.minute), record].sort((a, b) => a.minute - b.minute);
}

export type CountField = 'breaks' | 'water' | 'stretches' | 'eyeBreaks' | 'standingMinutes';

export function bumpCount(counts: readonly DayCounts[], date: string, field: CountField): DayCounts[] {
  const existing = counts.find((entry) => entry.date === date);
  if (!existing) return [...counts, { date, breaks: field === 'breaks' ? 1 : 0, water: field === 'water' ? 1 : 0, [field]: 1 }];
  return counts.map((entry) => (entry.date === date ? { ...entry, [field]: (entry[field] ?? 0) + 1 } : entry));
}
