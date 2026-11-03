import { formatDuration, isGoodDay, localDayKey, migrateMinute, recentDays, streakStats, weekdayLabel, type DayCounts, type MinuteRecord } from './aggregate';
import type { RangePoint } from './dashboard';

export type PeriodId = 'today' | 'week' | 'month';
export const PERIOD_DAYS: Record<PeriodId, number> = { today: 1, week: 7, month: 30 };

export interface PeriodNames {
  /** "this week" */
  current: string;
  /** "last week" */
  previous: string;
  /** "This week vs last week" */
  compare: string;
  scoreLabel: string;
  first: string;
}

export function periodNames(period: PeriodId): PeriodNames {
  if (period === 'today') return { current: 'today', previous: 'yesterday', compare: 'Today vs yesterday', scoreLabel: "Today's score", first: 'First day, nice start' };
  if (period === 'month') return { current: 'this month', previous: 'last month', compare: 'This month vs last month', scoreLabel: 'Monthly score', first: 'First month, nice start' };
  return { current: 'this week', previous: 'last week', compare: 'This week vs last week', scoreLabel: 'Weekly score', first: 'First week, nice start' };
}

/** Cached local day and hour lookups. One Intl call per 15 minutes of data instead of one per minute. */
export interface DayClock {
  day(minute: number): string;
  hour(minute: number): number;
}

export function dayClock(timeZone: string): DayClock {
  const days = new Map<number, string>();
  const hours = new Map<number, number>();
  const hourFormat = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
  return {
    day(minute) {
      const slot = Math.floor(minute / 15);
      let value = days.get(slot);
      if (value === undefined) {
        value = localDayKey(slot * 15 * 60_000, timeZone);
        days.set(slot, value);
      }
      return value;
    },
    hour(minute) {
      const slot = Math.floor(minute / 15);
      let value = hours.get(slot);
      if (value === undefined) {
        const text = hourFormat.formatToParts(new Date(slot * 15 * 60_000)).find((part) => part.type === 'hour')?.value ?? '0';
        value = Number(text) % 24;
        hours.set(slot, value);
      }
      return value;
    },
  };
}

/** Local day keys for this period and the one before it, oldest first. */
export function periodWindows(nowMs: number, timeZone: string, period: PeriodId): { current: string[]; previous: string[] } {
  const count = PERIOD_DAYS[period];
  const days = recentDays(nowMs, timeZone, count * 2).map((day) => day.date);
  return { current: days.slice(-count), previous: days.slice(0, Math.max(0, days.length - count)) };
}

export type HabitField = 'breaks' | 'water' | 'stretches' | 'eyeBreaks' | 'standUps';

export interface PeriodSummary {
  rows: MinuteRecord[];
  tracked: number;
  average: number | null;
  great: number;
  drift: number;
  slouch: number;
  sit: number;
  stand: number;
  /** Days with tracked minutes or any logged habit. */
  activeDays: number;
  /** Average per active day. Null when nothing happened in the period. */
  perDay: Record<HabitField, number | null>;
}

export function sitStandMinutes(rows: readonly MinuteRecord[]): { sit: number; stand: number } {
  let stand = 0;
  for (const row of rows) if (row.mode === 'stand') stand += 1;
  return { sit: rows.length - stand, stand };
}

export function summarizePeriod(minutes: readonly MinuteRecord[], counts: readonly DayCounts[], dates: readonly string[], clock: DayClock): PeriodSummary {
  const wanted = new Set(dates);
  const rows = minutes.filter((row) => wanted.has(clock.day(row.minute))).map(migrateMinute);
  const tracked = rows.length;
  const average = tracked === 0 ? null : rows.reduce((sum, row) => sum + row.score, 0) / tracked;
  const inPeriod = counts.filter((entry) => wanted.has(entry.date));
  const active = new Set(rows.map((row) => clock.day(row.minute)));
  for (const entry of inPeriod) if (habitTotal(entry) > 0) active.add(entry.date);
  const activeDays = active.size;
  const per = (pick: (entry: DayCounts) => number): number | null =>
    activeDays === 0 ? null : roundOne(inPeriod.reduce((sum, entry) => sum + pick(entry), 0) / activeDays);
  const state = (name: 'great' | 'drift' | 'slouch') => rows.filter((row) => row.state === name).length;
  return {
    rows,
    tracked,
    average,
    great: state('great'),
    drift: state('drift'),
    slouch: state('slouch'),
    ...sitStandMinutes(rows),
    activeDays,
    perDay: {
      breaks: per((entry) => entry.breaks),
      water: per((entry) => entry.water),
      stretches: per((entry) => entry.stretches ?? 0),
      eyeBreaks: per((entry) => entry.eyeBreaks ?? 0),
      // Stored as "standingMinutes", but it counts "I stood up" taps.
      standUps: per((entry) => entry.standingMinutes ?? 0),
    },
  };
}

/** The local hour with the highest average score, with at least minMinutes tracked in it. */
export function bestHour(rows: readonly MinuteRecord[], clock: DayClock, minMinutes = 10): { hour: number; average: number } | null {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const row of rows) {
    const hour = clock.hour(row.minute);
    const entry = sums.get(hour) ?? { sum: 0, n: 0 };
    entry.sum += row.score;
    entry.n += 1;
    sums.set(hour, entry);
  }
  let best: { hour: number; average: number; n: number } | null = null;
  for (const [hour, entry] of sums) {
    if (entry.n < minMinutes) continue;
    const average = entry.sum / entry.n;
    if (!best || average > best.average || (average === best.average && entry.n > best.n)) best = { hour, average, n: entry.n };
  }
  return best ? { hour: best.hour, average: Math.round(best.average) } : null;
}

/** The local hour with the most slouch minutes. */
export function mostSlouchHour(rows: readonly MinuteRecord[], clock: DayClock): number | null {
  const counts = new Map<number, number>();
  for (const row of rows.map(migrateMinute)) {
    if (row.state !== 'slouch') continue;
    const hour = clock.hour(row.minute);
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  let best: { hour: number; n: number } | null = null;
  for (const [hour, n] of counts) if (!best || n > best.n) best = { hour, n };
  return best?.hour ?? null;
}

export function hourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const face = hour % 12 === 0 ? 12 : hour % 12;
  return `${face} ${suffix}`;
}

/** Current and best streak of good days, using the one shared good-day rule. */
export function streakFor(minutes: readonly MinuteRecord[], nowMs: number, timeZone: string, clock: DayClock, dayCount = 60): { current: number; best: number } {
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const row of minutes) {
    const date = clock.day(row.minute);
    const entry = byDay.get(date) ?? { sum: 0, n: 0 };
    entry.sum += row.score;
    entry.n += 1;
    byDay.set(date, entry);
  }
  const days = recentDays(nowMs, timeZone, dayCount).map((day) => {
    const entry = byDay.get(day.date);
    return { counts: isGoodDay(entry ? entry.sum / entry.n : null, entry?.n ?? 0) };
  });
  return streakStats(days);
}

export type HeadlineTone = 'up' | 'down' | 'same' | 'first' | 'none';

export function scoreHeadline(current: number | null, previous: number | null, period: PeriodId): { title: string; note: string | null; tone: HeadlineTone } {
  const names = periodNames(period);
  if (current === null) return { title: period === 'today' ? 'Nothing tracked yet today' : `Nothing tracked yet ${names.current}`, note: 'Start Live view and your score fills in as you work.', tone: 'none' };
  if (previous === null) return { title: names.first, note: `Your first ${names.scoreLabel.toLowerCase()} is in.`, tone: 'first' };
  const delta = Math.round(current) - Math.round(previous);
  if (delta > 0) return { title: `Up ${delta} from ${names.previous}`, note: null, tone: 'up' };
  if (delta < 0) return { title: `Down ${Math.abs(delta)} from ${names.previous}`, note: 'Small dips are normal. A short break can help you reset.', tone: 'down' };
  return { title: `Same as ${names.previous}`, note: 'Nice and steady.', tone: 'same' };
}

export type NoteTone = 'good' | 'calm' | 'none';

export interface ChangeNote {
  text: string;
  tone: NoteTone;
}

/** "+1h 45m vs last week", "22 min less than last week", "Same as last week". Drops are calm, never red. */
export function changeNote(
  current: number | null,
  previous: number | null,
  previousName: string,
  options: { lowerIsBetter?: boolean; format: (value: number) => string; fewer?: boolean },
): ChangeNote {
  if (current === null) return { text: 'Nothing tracked yet', tone: 'none' };
  if (previous === null) return { text: `No data from ${previousName} yet`, tone: 'none' };
  const delta = roundOne(current - previous);
  if (delta === 0) return { text: `Same as ${previousName}`, tone: 'calm' };
  const less = options.fewer ? 'fewer' : 'less';
  if (delta > 0) {
    if (options.lowerIsBetter) return { text: `${options.format(delta)} more than ${previousName}`, tone: 'calm' };
    return { text: `+${options.format(delta)} vs ${previousName}`, tone: 'good' };
  }
  return { text: `${options.format(Math.abs(delta))} ${less} than ${previousName}`, tone: options.lowerIsBetter ? 'good' : 'calm' };
}

export function minutesLabel(minutes: number): string {
  const whole = Math.round(minutes);
  return whole < 60 ? `${whole} min` : formatDuration(whole);
}

export function perDayLabel(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Every encouraging line that is true for this data. Only real comparisons, no medical claims. */
export function insightLines(input: {
  period: PeriodId;
  current: PeriodSummary;
  previous: PeriodSummary;
  streak: number;
  best: { hour: number } | null;
}): string[] {
  const names = periodNames(input.period);
  const { current, previous } = input;
  const lines: string[] = [];
  if (current.tracked === 0) return lines;
  const hasPrevious = previous.tracked > 0;
  if (hasPrevious && current.great / current.tracked > previous.great / previous.tracked + 0.02) lines.push(`You sat tall more often than ${names.previous}.`);
  if (input.best) lines.push(`Your best hour was ${hourLabel(input.best.hour)}.`);
  if (input.streak >= 2) lines.push(`${input.streak}-day streak, keep it going!`);
  if (hasPrevious && current.slouch < previous.slouch) lines.push(`You spent less time slouching than ${names.previous}.`);
  const breaks = current.perDay.breaks;
  const breaksBefore = previous.perDay.breaks;
  if (breaks !== null && breaksBefore !== null && breaks > breaksBefore) lines.push(`You took more breaks than ${names.previous}.`);
  if (lines.length === 0) lines.push(`You tracked ${formatDuration(current.tracked)} ${names.current}. Every minute helps.`);
  return lines;
}

/** One line a day, rotating through the true ones, with the user's name when the app has it. */
export function pickInsight(lines: readonly string[], seed: number, name: string): string | null {
  if (lines.length === 0) return null;
  const line = lines[((seed % lines.length) + lines.length) % lines.length]!;
  const first = name.trim().split(/\s+/)[0];
  return first ? `${line} Nice work, ${first}!` : `${line} Nice work!`;
}

/** This period vs the last one, lined up point by point. Today is by hour (8 AM to 6 PM); week and month are by day. */
export function comparePoints(current: PeriodSummary, previous: PeriodSummary, windows: { current: string[]; previous: string[] }, period: PeriodId, clock: DayClock): RangePoint[] {
  const mean = (values: number[]) => (values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
  if (period === 'today') {
    const byHour = (rows: readonly MinuteRecord[]) => {
      const map = new Map<number, number[]>();
      for (const row of rows) {
        const hour = clock.hour(row.minute);
        map.set(hour, [...(map.get(hour) ?? []), row.score]);
      }
      return map;
    };
    const now = byHour(current.rows);
    const before = byHour(previous.rows);
    return Array.from({ length: 11 }, (_, index) => {
      const hour = 8 + index;
      return { key: String(hour), label: hourLabel(hour), current: mean(now.get(hour) ?? []), previous: mean(before.get(hour) ?? []) };
    });
  }
  const byDay = (rows: readonly MinuteRecord[]) => {
    const map = new Map<string, number[]>();
    for (const row of rows) {
      const date = clock.day(row.minute);
      const bucket = map.get(date);
      if (bucket) bucket.push(row.score);
      else map.set(date, [row.score]);
    }
    return map;
  };
  const now = byDay(current.rows);
  const before = byDay(previous.rows);
  return windows.current.map((date, index) => {
    const prior = windows.previous[index];
    return {
      key: date,
      label: period === 'week' ? weekdayLabel(Date.parse(`${date}T12:00:00Z`), 'UTC') : shortDate(date),
      current: mean(now.get(date) ?? []),
      previous: prior === undefined ? null : mean(before.get(prior) ?? []),
    };
  });
}

function shortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[(month ?? 1) - 1]} ${day}`;
}

export interface Tile {
  label: string;
  value: string | null;
  note: ChangeNote;
}

export interface ProgressModel {
  empty: boolean;
  period: PeriodId;
  names: PeriodNames;
  score: number | null;
  previousScore: number | null;
  headline: ReturnType<typeof scoreHeadline>;
  insight: string | null;
  tiles: { sitting: Tile; breaks: Tile; slouch: Tile };
  points: RangePoint[];
  split: { great: number; drift: number; slouch: number } | null;
  slouchHour: number | null;
  bestHour: { hour: number; average: number } | null;
  sitStand: { sit: number; stand: number };
  streak: { current: number; best: number };
  habits: Tile[];
}

export function buildProgress(input: {
  minutes: readonly MinuteRecord[];
  counts: readonly DayCounts[];
  timeZone: string;
  nowMs: number;
  period: PeriodId;
  name: string;
}): ProgressModel {
  const { period, timeZone, nowMs } = input;
  const names = periodNames(period);
  const clock = dayClock(timeZone);
  const windows = periodWindows(nowMs, timeZone, period);
  const current = summarizePeriod(input.minutes, input.counts, windows.current, clock);
  const previous = summarizePeriod(input.minutes, input.counts, windows.previous, clock);
  const score = current.average === null ? null : Math.round(current.average);
  const previousScore = previous.average === null ? null : Math.round(previous.average);
  const streak = streakFor(input.minutes, nowMs, timeZone, clock);
  const best = bestHour(current.rows, clock);
  const prevOr = (value: number): number | null => (previous.tracked > 0 ? value : null);
  const minuteOpts = { format: minutesLabel };
  const sittingNote = changeNote(current.tracked > 0 ? current.great : null, prevOr(previous.great), names.previous, minuteOpts);
  const slouchNote = changeNote(current.tracked > 0 ? current.slouch : null, prevOr(previous.slouch), names.previous, { ...minuteOpts, lowerIsBetter: true });
  const habit = (label: string, field: HabitField, unit: (value: number) => string): Tile => ({
    label,
    value: current.perDay[field] === null ? null : unit(current.perDay[field]!),
    note: changeNote(current.perDay[field], previous.perDay[field], names.previous, { format: perDayLabel, fewer: true }),
  });
  const perDay = period === 'today' ? '' : ' a day';
  let split: ProgressModel['split'] = null;
  if (current.tracked > 0) {
    const great = Math.round((current.great / current.tracked) * 100);
    const drift = Math.round((current.drift / current.tracked) * 100);
    split = { great, drift, slouch: Math.max(0, 100 - great - drift) };
  }
  return {
    empty: input.minutes.length === 0,
    period,
    names,
    score,
    previousScore,
    headline: scoreHeadline(current.average, previous.average, period),
    insight: pickInsight(insightLines({ period, current, previous, streak: streak.current, best }), Math.floor(nowMs / 86_400_000), input.name),
    tiles: {
      sitting: { label: 'Sitting well', value: current.tracked > 0 ? formatDuration(current.great) : null, note: sittingNote },
      breaks: {
        label: period === 'today' ? 'Breaks today' : 'Breaks per day',
        value: current.perDay.breaks === null ? null : perDayLabel(current.perDay.breaks),
        note: changeNote(current.perDay.breaks, previous.perDay.breaks, names.previous, { format: perDayLabel, fewer: true }),
      },
      slouch: { label: 'Slouch time', value: current.tracked > 0 ? formatDuration(current.slouch) : null, note: slouchNote },
    },
    points: comparePoints(current, previous, windows, period, clock),
    split,
    slouchHour: mostSlouchHour(current.rows, clock),
    bestHour: best,
    sitStand: { sit: current.sit, stand: current.stand },
    streak,
    habits: [
      habit('Water', 'water', (value) => `${perDayLabel(value)} glasses${perDay}`),
      habit('Stretches', 'stretches', (value) => `${perDayLabel(value)}${perDay}`),
      habit('Eye breaks', 'eyeBreaks', (value) => `${perDayLabel(value)}${perDay}`),
      habit('Stood up', 'standUps', (value) => `${perDayLabel(value)} ${value === 1 ? 'time' : 'times'}${perDay}`),
    ],
  };
}

export function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function habitTotal(entry: DayCounts): number {
  return entry.breaks + entry.water + (entry.stretches ?? 0) + (entry.eyeBreaks ?? 0) + (entry.standingMinutes ?? 0);
}
