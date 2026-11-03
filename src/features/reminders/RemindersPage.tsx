import { useEffect, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { reminderTiming } from '../../lib/reminders/config';
import { markDone, resumeAll, snoozeAll, snoozeKind } from '../../lib/reminders/holds';
import { formatMinute, type RhythmDot } from '../../lib/wellness/rhythm';
import { speakCaption } from '../calibrate/glowVoice';
import { useSession } from '../session/session-context';
import { useWellness } from '../wellness/wellness-context';
import { RemindersView } from './RemindersView';
import { useReminderHolds } from './useReminderHolds';
import { useReminderPlan } from './useReminderPlan';

export function RemindersPage() {
  usePageTitle('Reminders');
  const session = useSession();
  const wellness = useWellness();
  const plan = useReminderPlan(5_000);
  const [, setHolds] = useReminderHolds();
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setClockMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const at = (ms: number) => {
    const date = new Date(ms);
    return formatMinute(date.getHours() * 60 + date.getMinutes());
  };

  function done(dot: RhythmDot) {
    const now = Date.now();
    if (dot.kind === 'move') session.finishBreak();
    if (dot.kind === 'water') session.logWater();
    if (dot.kind === 'eye') session.logHabit('eyeBreaks');
    if (dot.kind === 'spot') session.skipSpot();
    if (dot.kind === 'stand') wellness.skip();
    setHolds((holds) => markDone(holds, dot.kind, now));
    setMessage(`${dot.label} done. Nice work!`);
  }

  function snooze(dot: RhythmDot) {
    const now = Date.now();
    if (dot.kind === 'stand') wellness.snooze();
    setHolds((holds) => snoozeKind(holds, dot.kind, now, reminderTiming.snoozeOneMin));
    setMessage(`${dot.label} snoozed until ${at(now + reminderTiming.snoozeOneMin * 60_000)}.`);
  }

  function snoozeEverything() {
    const now = Date.now();
    setHolds((holds) => snoozeAll(holds, now, reminderTiming.snoozeAllMin));
    setMessage(`All reminders snoozed until ${at(now + reminderTiming.snoozeAllMin * 60_000)}.`);
  }

  function resume() {
    setHolds(resumeAll);
    setMessage('Reminders are back on.');
  }

  function toggleVoice() {
    const on = !session.settings.sound;
    session.updateSettings({ sound: on });
    if (on) speakCaption('Voice tips are on', false);
  }

  const focusEndsAt = session.focus && !session.focus.ended ? session.focus.endsAt : null;

  return (
    <RemindersView
      clockMs={clockMs}
      dots={plan.dots}
      settings={session.settings}
      snoozedUntilMs={plan.snoozedUntilMs}
      focusEndsAt={focusEndsAt}
      message={message}
      onUpdate={session.updateSettings}
      onDone={done}
      onSnooze={snooze}
      onSnoozeAll={snoozeEverything}
      onResume={resume}
      onStartFocus={(minutes) => {
        session.startFocus(minutes);
        setMessage(`Focus mode is on for ${minutes} min.`);
      }}
      onToggleVoice={toggleVoice}
    />
  );
}
