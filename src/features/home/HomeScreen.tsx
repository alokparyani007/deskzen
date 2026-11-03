import { useState } from 'react';
import { DayStrip, HomeGreeting, QuickChips, ReminderStrip } from './HomeRhythm';
import { HomeStats } from './HomeStats';
import { LiveHero } from './LiveHero';

export function HomeScreen({ scrollChips }: { scrollChips: boolean }) {
  const [nowMs] = useState(() => Date.now());
  return (
    <div className="flex min-h-dvh flex-col bg-stage px-4 pb-24 pt-5 text-white lg:min-h-full lg:px-8 lg:py-6">
      <HomeGreeting nowMs={nowMs} />
      <div className="mt-4 grid items-stretch gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)]">
        <LiveHero nowMs={nowMs} />
        <HomeStats nowMs={nowMs} />
      </div>
      <DayStrip nowMs={nowMs} />
      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ReminderStrip />
        <QuickChips scroll={scrollChips} />
      </div>
      <p className="mt-4 text-center text-xs text-white/55">DeskZen is a wellness tool, not a medical device.</p>
    </div>
  );
}
