import type { PoseMode } from '../features/zen2/zenConfig';
import { inLabel, reminderName } from '../lib/reminders/plan';
import { formatMinute, nextReminder, quietBlocks, type ReminderClock, type RhythmDot } from '../lib/wellness/rhythm';

export { reminderName };

export type StatusTone = 'calm' | 'good' | 'drift';

export interface SidebarStatus {
  /** Match percent for the ring, or null when there is no live reading. */
  ring: number | null;
  title: string;
  detail: string;
  tone: StatusTone;
  /** The block links to Set my Zen (no print yet, or an old one). */
  setZen: boolean;
}

export interface StatusInput {
  print: 'loading' | 'none' | 'old' | 'zen';
  live: boolean;
  match: number | null;
  drifting: boolean;
  mode: PoseMode;
}

/** The small live status at the top of the sidebar. Null while the print is still loading. */
export function sidebarStatus(input: StatusInput): SidebarStatus | null {
  const pose = input.mode === 'stand' ? 'Standing' : 'Sitting';
  if (input.print === 'loading') return null;
  if (input.print === 'none') return { ring: null, title: 'Set my Zen to start', detail: 'Save your Posture Print', tone: 'calm', setZen: true };
  if (input.print === 'old') return { ring: null, title: 'Set your Zen again', detail: 'New, more accurate outline', tone: 'calm', setZen: true };
  if (!input.live) return { ring: null, title: 'Zen set', detail: `${pose} \u00b7 Camera off`, tone: 'calm', setZen: false };
  if (input.match === null) return { ring: null, title: 'Looking for you', detail: `${pose} \u00b7 Zen set`, tone: 'calm', setZen: false };
  if (input.drifting) return { ring: input.match, title: 'Drifting', detail: `${pose} \u00b7 Zen set`, tone: 'drift', setZen: false };
  return { ring: input.match, title: 'On track', detail: `${pose} \u00b7 Zen set`, tone: 'good', setZen: false };
}

export interface ReminderSettings extends ReminderClock {
  quietHours: boolean;
  quietStart: string;
  quietEnd: string;
}

/** The next reminder for the sidebar card, using the same rules as Home and Reminders. Null when none is left or it is quiet time. */
export function upcomingReminder(settings: ReminderSettings, nowMin: number): { name: string; when: string } | null {
  if (quietBlocks(nowMin, clock(settings.quietStart), clock(settings.quietEnd), settings.quietHours)) return null;
  return upcomingLabel(nextReminder(settings, nowMin), nowMin);
}

/** "Move break" and "18 min" (or a clock time when it is an hour or more away). */
export function upcomingLabel(next: RhythmDot | null, nowMin: number): { name: string; when: string } | null {
  if (!next) return null;
  const away = Math.max(0, next.minute - nowMin);
  const when = away < 60 ? inLabel(away) : formatMinute(next.minute);
  return { name: next.label, when };
}

function clock(value: string): number {
  const [hour, minute] = value.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}
