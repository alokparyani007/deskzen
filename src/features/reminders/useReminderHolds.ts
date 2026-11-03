import { useCallback, useSyncExternalStore } from 'react';
import { emptyHolds, getHolds, setHolds, subscribeHolds, type ReminderHolds } from '../../lib/reminders/holds';

/** Shared snoozes and "done" marks. Every screen updates together. */
export function useReminderHolds(): [ReminderHolds, (update: (holds: ReminderHolds) => ReminderHolds) => void] {
  const holds = useSyncExternalStore(subscribeHolds, getHolds, () => emptyHolds);
  const update = useCallback((next: (value: ReminderHolds) => ReminderHolds) => setHolds(next), []);
  return [holds, update];
}
