import { planDay, type PlanLive, type PlanSettings } from '../reminders/plan';

export type ReminderKind = 'posture' | 'move' | 'water' | 'eye' | 'stand' | 'spot';

export interface RhythmDot {
  kind: ReminderKind;
  minute: number;
  label: string;
}

/** The settings the reminder planner needs. See planDay for the full rules. */
export type ReminderClock = PlanSettings;

/** The next reminder still ahead today, from the shared day planner. */
export function nextReminder(settings: ReminderClock, nowMin: number, live?: PlanLive): RhythmDot | null {
  return planDay(settings, nowMin, live)[0] ?? null;
}

export function reminderDots(startMin: number, endMin: number, everyMin: number, kind: ReminderKind, name: string): RhythmDot[] {
  if (everyMin <= 0 || endMin <= startMin) return [];
  const dots: RhythmDot[] = [];
  for (let minute = startMin + everyMin; minute <= endMin; minute += everyMin) {
    dots.push({ kind, minute, label: `${name} at ${formatMinute(minute)}` });
  }
  return dots;
}

export function quietBlocks(nowMin: number, startMin: number, endMin: number, enabled: boolean): boolean {
  if (!enabled || startMin === endMin) return false;
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

export function planDue(items: readonly { id: string; at: number }[]): { now: string[]; later: string[] } {
  const ordered = [...items].sort((a, b) => a.at - b.at);
  if (ordered.length <= 1) return { now: ordered.map((item) => item.id), later: [] };
  const first = ordered[0]!;
  const close = ordered.filter((item) => item.at - first.at <= 3);
  if (close.length >= 2) return { now: close.map((item) => item.id), later: ordered.slice(close.length).map((item) => item.id) };
  return { now: [first.id], later: ordered.slice(1).map((item) => item.id) };
}

export function snoozeMinute(minute: number, add: number): number {
  return minute + add;
}

export function notificationAllowed(permission: NotificationPermission, hidden: boolean): boolean {
  return hidden && permission === 'granted';
}

export function formatMinute(minute: number): string {
  const wrapped = ((minute % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const face = hour % 12 === 0 ? 12 : hour % 12;
  return `${face}:${mins.toString().padStart(2, '0')} ${suffix}`;
}
