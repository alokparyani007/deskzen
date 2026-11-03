import { isGoodDay, localDayKey, migrateMinute, type DayCounts, type MinuteRecord, type MinuteState } from './aggregate';

export type RangeId = 'today' | 'week' | 'month';
export type ChangeTone = 'good' | 'bad' | 'flat';

export interface RangePoint {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
}

export interface StripCell {
  label: string;
  previous: string;
  current: string;
  delta: number;
  tone: ChangeTone;
}

export interface ActionItem {
  id: string;
  label: string;
  done: boolean;
  tag?: string;
}

const GOALS = { breaks: 6, water: 8, stretches: 4, eyeBreaks: 8, standing: 60 };

export function stateShares(minutes: readonly MinuteRecord[]): { great: number; drift: number; slouch: number } {
  const ready = minutes.map(migrateMinute);
  if (ready.length === 0) return { great: 0, drift: 0, slouch: 0 };
  const count = (state: MinuteState) => ready.filter((item) => item.state === state).length;
  const great = (count('great') / ready.length) * 100;
  const drift = (count('drift') / ready.length) * 100;
  const slouch = (count('slouch') / ready.length) * 100;
  const total = great + drift + slouch;
  return { great, drift, slouch: slouch + (100 - total) };
}

export function habitStreak(minutes: readonly MinuteRecord[], nowMs: number, timeZone: string): number {
  const byDay = new Map<string, number[]>();
  for (const record of minutes) {
    const date = localDayKey(record.minute * 60_000, timeZone);
    const bucket = byDay.get(date) ?? [];
    bucket.push(record.score);
    byDay.set(date, bucket);
  }
  let streak = 0;
  for (let back = 0; back < 60; back += 1) {
    const date = localDayKey(nowMs - back * 86_400_000, timeZone);
    const scores = byDay.get(date) ?? [];
    const average = scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const counts = isGoodDay(average, scores.length);
    if (!counts && back === 0) continue;
    if (!counts) break;
    streak += 1;
  }
  return streak;
}

export function worstHour(minutes: readonly MinuteRecord[], timeZone: string): { weekday: number; hour: number } | null {
  const grid = new Map<string, number>();
  for (const record of minutes.map(migrateMinute)) {
    if (record.state !== 'slouch') continue;
    const date = new Date(record.minute * 60_000);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(date);
    const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const key = `${weekday}-${hour}`;
    grid.set(key, (grid.get(key) ?? 0) + 1);
  }
  let best: { weekday: number; hour: number; count: number } | null = null;
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const [key, count] of grid) {
    const [name, hourText] = key.split('-');
    const weekday = names.indexOf(name ?? '');
    const hour = Number(hourText);
    if (!best || count > best.count) best = { weekday, hour, count };
  }
  return best ? { weekday: best.weekday, hour: best.hour } : null;
}

export function compareRanges(current: readonly (number | null)[], previous: readonly (number | null)[]): number | null {
  const pair = current.map((value, index) => ({ value, before: previous[index] ?? null })).filter((item) => item.value !== null && item.before !== null);
  if (pair.length === 0) return null;
  const now = pair.reduce((sum, item) => sum + (item.value ?? 0), 0) / pair.length;
  const then = pair.reduce((sum, item) => sum + (item.before ?? 0), 0) / pair.length;
  return Math.round(now - then);
}

export function alignDays(current: RangePoint[], previousLabels: readonly string[]): boolean {
  return current.every((point, index) => previousLabels[index] === undefined || point.label === previousLabels[index]);
}

export function changeTone(metric: 'score' | 'sitting' | 'slouch' | 'breaks' | 'water', delta: number): ChangeTone {
  if (delta === 0) return 'flat';
  const lowerIsBetter = metric === 'slouch';
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  return good ? 'good' : 'bad';
}

export function buildStrip(input: {
  range: RangeId;
  score: [number, number];
  sitting: [number, number];
  slouch: [number, number];
  breaks: [number, number];
  water: [number, number];
}): StripCell[] {
  const previousName = input.range === 'today' ? 'yesterday' : input.range === 'month' ? 'last month' : 'last week';
  const currentName = input.range === 'today' ? 'today' : input.range === 'month' ? 'this month' : 'this week';
  const cell = (label: string, metric: StripCell extends never ? never : 'score' | 'sitting' | 'slouch' | 'breaks' | 'water', pair: [number, number], suffix = ''): StripCell => {
    const delta = Math.round(pair[0] - pair[1]);
    return {
      label,
      previous: `${pair[1]}${suffix} ${previousName}`,
      current: `${pair[0]}${suffix} ${currentName}`,
      delta,
      tone: changeTone(metric, delta),
    };
  };
  return [
    cell('Posture score', 'score', input.score),
    cell('Sitting well', 'sitting', input.sitting, 'm'),
    cell('Slouch time', 'slouch', input.slouch, 'm'),
    cell('Breaks per day', 'breaks', input.breaks),
    cell('Water per day', 'water', input.water),
  ];
}

export function actionItems(input: {
  spotOrLive: boolean;
  waterLeft: number;
  slouchHour: number | null;
  printOld: boolean;
  standingLeft: number | null;
  manual: Record<string, boolean>;
}): ActionItem[] {
  const items: ActionItem[] = [
    { id: 'morning', label: 'Morning posture check', done: input.spotOrLive || Boolean(input.manual.morning) },
    { id: 'stretch', label: 'Stretch break', done: Boolean(input.manual.stretch), tag: input.slouchHour === null ? undefined : formatHour(input.slouchHour) },
    { id: 'water', label: input.waterLeft > 0 ? `Drink ${input.waterLeft} more glasses of water` : 'Water goal reached', done: input.waterLeft <= 0 || Boolean(input.manual.water) },
  ];
  if (input.standingLeft !== null) items.push({ id: 'stand', label: `Stand for ${input.standingLeft} more minutes`, done: input.standingLeft <= 0 || Boolean(input.manual.stand) });
  if (input.printOld) items.push({ id: 'relock', label: 'Re-lock your Posture Print', done: Boolean(input.manual.relock) });
  return items.sort((a, b) => Number(a.done) - Number(b.done));
}

export function addGlass(counts: readonly DayCounts[], date: string): DayCounts[] {
  const existing = counts.find((entry) => entry.date === date);
  if (!existing) return [...counts, { date, breaks: 0, water: 1 }];
  return counts.map((entry) => (entry.date === date ? { ...entry, water: entry.water + 1 } : entry));
}

export function rangeHeadline(delta: number | null, current: number | null, range: RangeId): string {
  const name = range === 'today' ? 'yesterday' : range === 'month' ? 'last month' : 'last week';
  if (current === null) return 'Your chart fills in as you work. Check back tomorrow!';
  if (delta === null) return `Steady at ${Math.round(current)}`;
  if (delta > 0) return `Up ${delta} points from ${name}`;
  if (delta < 0) return `Down ${Math.abs(delta)} points from ${name}. Let's bounce back!`;
  return `Steady at ${Math.round(current)}`;
}

export const habitGoals = GOALS;

function formatHour(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const value = hour % 12 === 0 ? 12 : hour % 12;
  return `${value} ${suffix}`;
}
