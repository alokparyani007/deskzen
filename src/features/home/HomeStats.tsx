import { Link } from 'react-router-dom';
import { CircleCheck, Coffee, Gauge } from 'lucide-react';
import { formatDuration, localDayKey, type MinuteRecord } from '../../lib/progress/aggregate';
import { habitGoals } from '../../lib/progress/dashboard';
import { averageScore, minutesInState, todayLine } from '../../lib/home/liveHome';
import { useSession } from '../session/session-context';

export function HomeStats({ nowMs }: { nowMs: number }) {
  const { minutes, dayCounts, timeZone } = useSession();
  const todayKey = localDayKey(nowMs, timeZone);
  const yesterdayKey = localDayKey(nowMs - 86_400_000, timeZone);
  const today = minutes.filter((item) => localDayKey(item.minute * 60_000, timeZone) === todayKey);
  const yesterday = minutes.filter((item) => localDayKey(item.minute * 60_000, timeZone) === yesterdayKey);
  const todayCounts = dayCounts.find((entry) => entry.date === todayKey);
  const yesterdayBreaks = dayCounts.find((entry) => entry.date === yesterdayKey)?.breaks ?? 0;
  const hasToday = today.length > 0;
  const score = hasToday ? Math.round(averageScore(today) ?? 0) : null;
  const sitting = hasToday ? minutesInState(today, 'great') : null;
  const breaks = todayCounts?.breaks ?? 0;
  const hasBreaks = Boolean(todayCounts) || breaks > 0;

  return (
    <div className="grid grid-cols-3 gap-3 lg:h-full lg:grid-cols-1 lg:grid-rows-3">
      <Metric to="/progress" icon={Gauge} label="Posture score today" value={score === null ? '—' : String(score)} note={todayLine(averageScore(today), averageScore(yesterday))} />
      <Metric
        to="/progress"
        icon={CircleCheck}
        label="Sitting well"
        value={sitting === null ? '—' : formatDuration(sitting)}
        note={sitting === null ? 'Starts today' : minuteNote(sitting, yesterday)}
        up={sitting !== null && yesterday.length > 0 && sitting > minutesInState(yesterday, 'great')}
      />
      <Metric
        to="/reminders"
        icon={Coffee}
        label="Breaks"
        value={hasBreaks || hasToday ? `${breaks} of ${habitGoals.breaks}` : '—'}
        note={hasBreaks || hasToday ? breakNote(breaks - yesterdayBreaks) : 'Starts today'}
      />
    </div>
  );
}

function minuteNote(today: number, yesterday: readonly MinuteRecord[]): string {
  if (yesterday.length === 0) return 'Starts today';
  const delta = today - minutesInState(yesterday, 'great');
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  return `${signed} min vs yesterday`;
}

function breakNote(delta: number): string {
  if (delta === 0) return 'Same as yesterday';
  if (delta === 1) return 'One more than yesterday';
  if (delta === -1) return 'One fewer than yesterday';
  if (delta > 1) return `${delta} more than yesterday`;
  return `${Math.abs(delta)} fewer than yesterday`;
}

function Metric({
  to,
  icon: Icon,
  label,
  value,
  note,
  up = false,
}: {
  to: string;
  icon: typeof Gauge;
  label: string;
  value: string;
  note: string;
  up?: boolean;
}) {
  return (
    <Link to={to} className="flex h-full flex-col justify-center rounded-2xl border border-white/10 bg-dock p-4">
      <p className="flex items-center gap-2 text-sm text-white/70">
        <Icon className="size-5 shrink-0 text-print" aria-hidden="true" />
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold lg:text-4xl">{value}</p>
      <p className={`mt-1 text-sm ${up ? 'text-print' : 'text-white/60'}`}>{note}</p>
    </Link>
  );
}
