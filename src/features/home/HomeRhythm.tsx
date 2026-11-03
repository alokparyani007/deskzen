import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Settings } from 'lucide-react';
import { habitStreak } from '../../lib/progress/dashboard';
import { localDayKey } from '../../lib/progress/aggregate';
import { dayTimeline, feelGood, greeting, tallShare } from '../../lib/home/liveHome';
import { upcomingLabel } from '../../app/sidebarStatus';
import { useReminderPlan } from '../reminders/useReminderPlan';
import { useSession } from '../session/session-context';

export function HomeGreeting({ nowMs }: { nowMs: number }) {
  const { settings, minutes, dayCounts, timeZone } = useSession();
  const today = localDayKey(nowMs, timeZone);
  const yesterday = localDayKey(nowMs - 86_400_000, timeZone);
  const line = feelGood({
    todayTall: tallShare(minutes.filter((item) => localDayKey(item.minute * 60_000, timeZone) === today)),
    yesterdayTall: tallShare(minutes.filter((item) => localDayKey(item.minute * 60_000, timeZone) === yesterday)),
    breaks: dayCounts.find((entry) => entry.date === today)?.breaks ?? 0,
    streak: habitStreak(minutes, nowMs, timeZone),
  });
  return (
    <header className="relative flex flex-wrap items-center gap-3 pr-12 md:pr-0">
      <h1 className="text-3xl font-semibold text-white">{greeting(new Date(nowMs).getHours(), settings.name)}</h1>
      <p className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand">{line}</p>
      <Link
        to="/settings"
        aria-label="Settings"
        className="absolute right-0 top-0 grid size-10 place-items-center rounded-full text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline md:hidden"
      >
        <Settings className="size-5" aria-hidden="true" />
      </Link>
    </header>
  );
}

export function DayStrip({ nowMs }: { nowMs: number }) {
  const { minutes, timeZone } = useSession();
  const slots = dayTimeline(minutes, nowMs, timeZone);
  const first = slots[0]?.label ?? '9 AM';
  const last = slots[slots.length - 1]?.label ?? '5 PM';
  return (
    <section className="mt-4" aria-label="Your day so far">
      <h2 className="text-sm font-semibold text-white/80">Your day so far</h2>
      <div className="mt-2 flex gap-1">
        {slots.map((slot) => (
          <div key={slot.hour} className="flex-1" title={slot.label}>
            <div className={`h-3 rounded-sm ${barClass(slot.state)} ${slot.now ? 'ring-2 ring-white' : ''}`} />
            <span className="sr-only">{slot.now ? 'Now, ' : ''}{slot.label}, {slot.state === 'empty' ? 'no reading yet' : slot.state}</span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-white/50">
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </section>
  );
}

export function ReminderStrip() {
  const plan = useReminderPlan();
  const next = plan.snoozedUntilMs !== null ? null : upcomingLabel(plan.next, plan.nowMin);
  if (!next) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-white/80">
      <Bell className="size-4 shrink-0" aria-hidden="true" />
      Next reminder {next.when.includes(':') ? `at ${next.when}` : next.when === 'now' ? 'now' : `in ${next.when}`} {'\u00b7'} {next.name}
    </p>
  );
}

export function QuickChips({ scroll }: { scroll: boolean }) {
  const { logHabit } = useSession();
  const [burst, setBurst] = useState('');
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  const tap = (id: string, run: () => void) => {
    setBurst(id);
    run();
  };
  const chip = 'shrink-0 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white';
  return (
    <div className={`flex items-center gap-2 ${scroll ? 'overflow-x-auto' : 'flex-wrap'}`}>
      <button type="button" className={`${chip} ${burst === 'water' && !reduced ? 'chip-burst' : ''}`} onClick={() => tap('water', () => logHabit('water'))}>Water +1</button>
      <button type="button" className={`${chip} ${burst === 'stood' && !reduced ? 'chip-burst' : ''}`} onClick={() => tap('stood', () => logHabit('standingMinutes'))}>I stood up</button>
      <Link to="/eye" className={`${chip} ${burst === 'eye' && !reduced ? 'chip-burst' : ''}`} onClick={() => tap('eye', () => logHabit('eyeBreaks'))}>Eye break</Link>
      <Link to="/break" className={`${chip} ${burst === 'stretch' && !reduced ? 'chip-burst' : ''}`} onClick={() => tap('stretch', () => logHabit('stretches'))}>Stretch</Link>
    </div>
  );
}

function barClass(state: string): string {
  if (state === 'great') return 'bg-print';
  if (state === 'drift') return 'bg-sky-brand';
  if (state === 'slouch') return 'bg-glow';
  return 'bg-white/15';
}
