import type { CameraMode, WorkStyle } from '../settings/defaults';
import type { ReminderKind, RhythmDot } from '../wellness/rhythm';
import type { DayHolds } from './holds';

/** The settings the day planner reads. Newer fields are optional so older callers keep working. */
export interface PlanSettings {
  workStart?: string;
  workEnd?: string;
  quietHours?: boolean;
  quietStart?: string;
  quietEnd?: string;
  workStyle?: WorkStyle;
  moveBreaks?: boolean;
  breakMinutes: number;
  standBreakMinutes?: number;
  intervalsOn?: boolean;
  water: boolean;
  waterMinutes: number;
  eyeRest: boolean;
  eyeRestMinutes: number;
  cameraMode?: CameraMode;
  spotChecks?: boolean;
  spotEveryMin: number;
  spotWorkDays?: number[];
}

/** Live timers that know better than the clock when the next one is due. */
export interface PlanLive {
  /** Minute of today the next move break is due, from the sitting timer. */
  moveDueMin?: number | null;
  /** Minute of today the next spot check is due, from the spot-check schedule. */
  spotDueMin?: number | null;
  /** The sit-stand interval timer, when intervals are on. */
  stand?: { dueMin: number; label: string; cycleMin: number } | null;
  holds?: DayHolds;
  /** Date.getDay() for today, used for spot-check work days. */
  weekday?: number;
}

export const DAY_MINUTES = 24 * 60;
const ORDER: ReminderKind[] = ['move', 'stand', 'water', 'eye', 'spot', 'posture'];

export function clockMinutes(value: string | undefined, fallback: number): number {
  if (!value || !/^\d{1,2}:\d{2}$/.test(value)) return fallback;
  const [hour, minute] = value.split(':').map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function inWindow(minute: number, start: number, end: number): boolean {
  const m = ((minute % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  if (start === end) return false;
  if (start < end) return m >= start && m < end;
  return m >= start || m < end;
}

export function workWindow(settings: Pick<PlanSettings, 'workStart' | 'workEnd'>): { start: number; end: number } {
  const start = clockMinutes(settings.workStart, 9 * 60);
  let end = clockMinutes(settings.workEnd, 18 * 60);
  if (end <= start) end = DAY_MINUTES;
  return { start, end };
}

export function isQuietAt(settings: Pick<PlanSettings, 'quietHours' | 'quietStart' | 'quietEnd'>, minute: number): boolean {
  if (!settings.quietHours) return false;
  return inWindow(minute, clockMinutes(settings.quietStart, 21 * 60), clockMinutes(settings.quietEnd, 7 * 60));
}

export function reminderName(kind: ReminderKind): string {
  if (kind === 'move') return 'Move break';
  if (kind === 'water') return 'Water';
  if (kind === 'eye') return 'Eye break';
  if (kind === 'spot') return 'Spot check';
  if (kind === 'stand') return 'Stand up';
  return 'Posture nudge';
}

/** Interval for move breaks: standing desks use the shift-or-sit timer. */
export function moveEvery(settings: Pick<PlanSettings, 'workStyle' | 'breakMinutes' | 'standBreakMinutes'>): number {
  return settings.workStyle === 'stand' ? (settings.standBreakMinutes ?? 40) : settings.breakMinutes;
}

/**
 * Every reminder still ahead today, in time order. One source for the dial,
 * the Today list, the sidebar card and Home. Reminders sit inside work hours,
 * skip quiet hours, and move past any snooze.
 */
export function planDay(settings: PlanSettings, nowMin: number, live: PlanLive = {}): RhythmDot[] {
  const { start, end } = workWindow(settings);
  const done = live.holds?.done ?? {};
  const dots: RhythmDot[] = [];
  const add = (kind: ReminderKind, minute: number, label = reminderName(kind)) => dots.push({ kind, minute, label });

  /** Times from anchor + every, inside work hours and not before now. */
  const series = (kind: ReminderKind, every: number, anchor: number, first?: number | null) => {
    if (!(every > 0)) return;
    if (first !== undefined && first !== null) {
      const at = Math.max(nowMin, first);
      add(kind, at);
      for (let minute = at + every; minute <= end; minute += every) if (minute >= start) add(kind, minute);
      return;
    }
    for (let minute = anchor + every; minute <= end; minute += every) {
      if (minute >= nowMin && minute >= start) add(kind, minute);
    }
  };

  const intervals = settings.intervalsOn === true && settings.workStyle === 'mixed';
  if (settings.moveBreaks !== false && !intervals) {
    series('move', moveEvery(settings), done.move ?? start, live.moveDueMin);
  }
  if (intervals && live.stand) {
    const at = Math.max(nowMin, live.stand.dueMin);
    add('stand', at, live.stand.label);
    if (live.stand.cycleMin > 0) for (let minute = at + live.stand.cycleMin; minute <= end; minute += live.stand.cycleMin) add('stand', minute);
  }
  if (settings.water) series('water', settings.waterMinutes, done.water ?? start);
  if (settings.eyeRest) series('eye', settings.eyeRestMinutes, done.eye ?? start);
  const workDay = live.weekday === undefined || (settings.spotWorkDays ?? [1, 2, 3, 4, 5]).includes(live.weekday);
  if ((settings.cameraMode ?? 'spot') === 'spot' && settings.spotChecks !== false && workDay) {
    series('spot', settings.spotEveryMin, done.spot ?? start, live.spotDueMin);
  }

  let kept = dots.filter((dot) => !isQuietAt(settings, dot.minute));
  const until = live.holds?.until ?? {};
  for (const kind of ORDER) {
    const hold = until[kind];
    if (hold === undefined || hold <= nowMin) continue;
    const held = kept.filter((dot) => dot.kind === kind && dot.minute < hold);
    if (held.length === 0) continue;
    kept = kept.filter((dot) => !(dot.kind === kind && dot.minute < hold));
    if (hold < DAY_MINUTES && !isQuietAt(settings, hold) && !kept.some((dot) => dot.kind === kind && dot.minute === hold)) {
      kept.push({ kind, minute: hold, label: held[0]!.label });
    }
  }
  return kept.sort((a, b) => a.minute - b.minute || ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** "18 min", "1 hr 5 min", or "now". */
export function inLabel(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  if (total <= 0) return 'now';
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}
