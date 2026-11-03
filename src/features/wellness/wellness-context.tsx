import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addDetectedTime, durationsFor, initialInterval, intervalMessage, skipInterval, snoozeInterval, stepInterval, type IntervalDurations, type IntervalState } from '../../lib/wellness/intervals';
import { getHolds, holdsForDay } from '../../lib/reminders/holds';
import { planDay } from '../../lib/reminders/plan';
import { wellnessConfig } from '../../lib/wellness/config';
import { featuresFor } from '../../lib/settings/visibility';
import { useSession } from '../session/session-context';

interface DayTotal {
  day: string;
  sitMs: number;
  standMs: number;
  moveMs: number;
  switches: number;
}

interface Clock {
  interval: IntervalState;
  day: string;
  at: number | null;
  note: string | null;
  history: DayTotal[];
}

interface WellnessValue {
  interval: IntervalState;
  note: string | null;
  message: string | null;
  weekStandMs: number;
  /** Sit-stand intervals are on and shown. */
  showIntervals: boolean;
  durations: IntervalDurations;
  snooze: () => void;
  skip: () => void;
  dismissNote: () => void;
}

const WellnessContext = createContext<WellnessValue | null>(null);
const LOG_KEY = 'sitglow.wellness';

export function WellnessProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const [clock, setClock] = useState<Clock>(() => loadClock(session.timeZone));
  const [typing, setTyping] = useState(false);
  const durations = durationsFor(session.settings);
  const speed = import.meta.env.DEV && session.settings.devSpeed10x ? wellnessConfig.devSpeed : 1;
  const showIntervals = featuresFor(session.settings.workStyle).intervalSection && session.settings.intervalsOn;

  if (session.wallMs !== null && session.wallMs !== clock.at) {
    setClock((current) => advance(current, session, durations, speed, typing, showIntervals));
  }

  useEffect(() => {
    let keys = 0;
    let last = 0;
    const onKey = () => {
      const now = Date.now();
      if (now - last > 10_000) keys = 0;
      last = now;
      keys += 1;
      if (keys >= 12) setTyping(true);
    };
    const id = window.setInterval(() => {
      if (Date.now() - last > 8_000) setTyping(false);
    }, 2000);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearInterval(id);
    };
  }, []);

  // Water and eye breaks follow the same day plan the Reminders dial shows, so
  // there is one shared timer. It runs on the wall clock, camera on or off.
  const settings = session.settings;
  useEffect(() => {
    let last = minuteOfDay(Date.now());
    let day = new Date().toDateString();
    const check = () => {
      const nowMs = Date.now();
      const nowMin = minuteOfDay(nowMs);
      if (new Date(nowMs).toDateString() !== day) {
        day = new Date(nowMs).toDateString();
        last = nowMin;
        return;
      }
      if (nowMin <= last) return;
      const due = planDay({ ...settings, moveBreaks: false, spotChecks: false, intervalsOn: false }, last + 1, { holds: holdsForDay(getHolds(), nowMs) }).filter(
        (dot) => dot.minute <= nowMin && (dot.kind === 'water' || dot.kind === 'eye'),
      );
      last = nowMin;
      const pick = due.at(-1);
      if (!pick) return;
      setClock((current) => ({ ...current, note: pick.kind === 'eye' ? 'Look about 20 feet away for 20 seconds.' : 'Time for a sip of water.' }));
    };
    const id = window.setInterval(check, 15_000);
    return () => window.clearInterval(id);
  }, [settings]);

  useEffect(() => {
    window.localStorage.setItem(LOG_KEY, JSON.stringify({ day: clock.day, history: clock.history, today: clock.interval }));
  }, [clock.day, clock.history, clock.interval]);

  const weekStandMs = clock.history.reduce((sum, day) => sum + day.standMs, 0) + clock.interval.standMs;
  const moveMinutes = Math.max(1, Math.round((session.settings.noStandingDesk ? durations.standMs + durations.moveMs : durations.moveMs || durations.standMs) / 60_000));
  const value = useMemo<WellnessValue>(
    () => ({
      interval: clock.interval,
      note: clock.note,
      message: showIntervals ? intervalMessage(clock.interval.nudge, moveMinutes) : null,
      weekStandMs,
      showIntervals,
      durations,
      snooze: () => setClock((current) => ({ ...current, interval: snoozeInterval(current.interval) })),
      skip: () =>
        setClock((current) => ({
          ...current,
          interval: skipInterval(current.interval, durations, session.settings.noStandingDesk),
        })),
      dismissNote: () => setClock((current) => ({ ...current, note: null })),
    }),
    [clock.interval, clock.note, durations, moveMinutes, session.settings.noStandingDesk, showIntervals, weekStandMs],
  );

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness(): WellnessValue {
  const value = useContext(WellnessContext);
  if (!value) throw new Error('useWellness must be used inside WellnessProvider');
  return value;
}

function advance(
  clock: Clock,
  session: ReturnType<typeof useSession>,
  durations: ReturnType<typeof durationsFor>,
  speed: number,
  typing: boolean,
  showIntervals: boolean,
): Clock {
  const today = new Date(session.wallMs ?? Date.now()).toLocaleDateString('en-CA', { timeZone: session.timeZone });
  let history = clock.history;
  let interval = clock.interval;
  if (clock.day !== today) {
    history = [...history, { day: clock.day, sitMs: interval.sitMs, standMs: interval.standMs, moveMs: interval.moveMs, switches: interval.switches }].slice(-14);
    interval = { ...initialInterval(durations), sitMs: 0, standMs: 0, moveMs: 0, switches: 0 };
  }
  const dt = clock.at === null || session.wallMs === null ? 0 : Math.max(0, session.wallMs - clock.at);
  const away = !session.cameraLive || session.readings?.quality === 'absent';
  const detected = away ? 'away' : session.posture === 'standing' ? 'standing' : 'sitting';
  const focusBusy = Boolean(session.focus && !session.focus.ended && (session.wallMs ?? 0) < session.focus.endsAt);
  if (showIntervals) {
    interval = stepInterval(interval, {
      dtMs: dt,
      detected,
      busy: session.settings.delayWhileBusy && (typing || focusBusy),
      noDesk: session.settings.noStandingDesk,
      durations,
      speed,
    });
  } else if (!away && dt > 0) {
    interval = addDetectedTime(interval, detected, dt * speed);
  }
  return { interval, day: today, at: session.wallMs, note: clock.note, history };
}

function loadClock(timeZone: string): Clock {
  const day = new Date().toLocaleDateString('en-CA', { timeZone });
  const durations = durationsFor({ intervalPreset: 'easy', customSitMin: 45, customStandMin: 15, customMoveMin: 2 });
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    if (!raw) return fresh(day, durations);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return fresh(day, durations);
    const record = parsed as { day?: string; history?: DayTotal[]; today?: IntervalState };
    return {
      interval: record.today ?? initialInterval(durations),
      day: record.day ?? day,
      at: null,
      note: null,
      history: Array.isArray(record.history) ? record.history : [],
    };
  } catch {
    return fresh(day, durations);
  }
}

function fresh(day: string, durations: ReturnType<typeof durationsFor>): Clock {
  return { interval: initialInterval(durations), day, at: null, note: null, history: [] };
}

function minuteOfDay(ms: number): number {
  const date = new Date(ms);
  return date.getHours() * 60 + date.getMinutes();
}
