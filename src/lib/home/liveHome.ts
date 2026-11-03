import { localDayKey, migrateMinute, type MinuteRecord, type MinuteState } from '../progress/aggregate';

export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 18;

export function greeting(hour: number, name: string): string {
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const trimmed = name.trim();
  return trimmed ? `${hello}, ${trimmed}` : hello;
}

export function feelGood(input: { todayTall: number | null; yesterdayTall: number | null; breaks: number; streak: number }): string {
  if (input.todayTall !== null && input.yesterdayTall !== null) {
    const delta = Math.round(input.todayTall - input.yesterdayTall);
    if (delta > 0) return `You sat tall ${delta}% more than yesterday. Nice!`;
  }
  if (input.breaks > 0) {
    return `${input.breaks} ${input.breaks === 1 ? 'break' : 'breaks'} already, great rhythm`;
  }
  if (input.streak > 0) return `${input.streak}-day streak!`;
  return "Fresh start today. Let's go!";
}

export type PillTone = 'great' | 'drift' | 'slouch';

export function posturePill(amount: number | null): { tone: PillTone; text: string } | null {
  if (amount === null) return null;
  if (amount < 1) return { tone: 'great', text: 'Sitting tall, matches your Posture Print' };
  if (amount < 3) return { tone: 'drift', text: 'Drifting a little' };
  return { tone: 'slouch', text: 'Slouching, ease back to your outline' };
}

export function todayLine(todayAvg: number | null, yesterdayAvg: number | null): string {
  if (todayAvg === null) return 'Starts today';
  const today = Math.round(todayAvg);
  if (yesterdayAvg === null) return `Today ${today}`;
  const delta = today - Math.round(yesterdayAvg);
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  return `Today ${today}, ${signed} vs yesterday`;
}

/** Less slouch than yesterday is good. Missing days stay flat. */
export function slouchTone(today: number | null, yesterday: number | null): 'good' | 'bad' | 'flat' {
  if (today === null || yesterday === null) return 'flat';
  if (today < yesterday) return 'good';
  if (today > yesterday) return 'bad';
  return 'flat';
}

export function printIsStale(createdAt: string, nowMs: number): boolean {
  const saved = Date.parse(createdAt);
  if (Number.isNaN(saved)) return false;
  return nowMs - saved > 14 * 86_400_000;
}

export function tallShare(minutes: readonly MinuteRecord[]): number | null {
  if (minutes.length === 0) return null;
  const great = minutes.map(migrateMinute).filter((item) => item.state === 'great').length;
  return (great / minutes.length) * 100;
}

export function averageScore(minutes: readonly MinuteRecord[]): number | null {
  if (minutes.length === 0) return null;
  return minutes.reduce((sum, item) => sum + item.score, 0) / minutes.length;
}

export function minutesInState(minutes: readonly MinuteRecord[], state: MinuteState): number {
  return minutes.map(migrateMinute).filter((item) => item.state === state).length;
}

export interface DaySlot {
  hour: number;
  label: string;
  state: MinuteState | 'empty';
  now: boolean;
}

export function dayTimeline(
  minutes: readonly MinuteRecord[],
  nowMs: number,
  timeZone: string,
  startHour = WORK_START_HOUR,
  endHour = WORK_END_HOUR,
): DaySlot[] {
  const today = localDayKey(nowMs, timeZone);
  const nowHour = hourInZone(nowMs, timeZone);
  const slots: DaySlot[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    const inHour = minutes.filter((item) => localDayKey(item.minute * 60_000, timeZone) === today && hourInZone(item.minute * 60_000, timeZone) === hour);
    const future = hour > nowHour;
    slots.push({
      hour,
      label: hourLabel(hour),
      state: future || inHour.length === 0 ? 'empty' : majorityState(inHour),
      now: hour === nowHour,
    });
  }
  return slots;
}

function majorityState(minutes: readonly MinuteRecord[]): MinuteState {
  const counts = { great: 0, drift: 0, slouch: 0 };
  for (const item of minutes.map(migrateMinute)) counts[item.state ?? 'slouch'] += 1;
  if (counts.slouch >= counts.drift && counts.slouch >= counts.great) return 'slouch';
  if (counts.drift >= counts.great) return 'drift';
  return 'great';
}

function hourInZone(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).formatToParts(new Date(epochMs));
  return Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
}

function hourLabel(hour: number): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const value = hour % 12 === 0 ? 12 : hour % 12;
  return `${value} ${suffix}`;
}
