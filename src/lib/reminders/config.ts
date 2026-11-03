/**
 * One place for every reminder interval choice. Reminders, Settings and the
 * settings store all read these lists, so the same options show up everywhere.
 */
type OptionList = readonly number[];

export const reminderOptions: Record<'move' | 'standBreak' | 'water' | 'eye' | 'nudgeDelay' | 'spotEvery' | 'spotLength' | 'stillness' | 'focus', OptionList> = {
  /** Move breaks while sitting, in minutes. */
  move: [30, 45, 60, 90],
  /** Shift-or-sit breaks for a standing desk, in minutes. */
  standBreak: [30, 40, 45],
  water: [45, 60, 90, 120],
  eye: [20, 30, 45, 60],
  /** Seconds of drifting before a posture nudge. */
  nudgeDelay: [15, 30, 60],
  spotEvery: [1, 5, 10, 15, 30, 60],
  spotLength: [10, 15, 20],
  /** Standing stillness reminder. 0 is off. */
  stillness: [0, 30, 45, 60],
  focus: [25, 50, 90],
};

export const reminderTiming = {
  /** "Snooze 10 min" on a single reminder. */
  snoozeOneMin: 10,
  /** "Snooze all 30 min". */
  snoozeAllMin: 30,
  /** The dial shows each reminder in the next 2 hours on its own, and thins out the rest. */
  soloWindowMin: 120,
  /** Reminders closer than this inside the solo window share one dot. */
  mergeMin: 15,
  /** Later reminders are grouped into one dot per hour. */
  bucketMin: 60,
} as const;

/** The closest allowed option. Ties go to the smaller value. */
export function snapTo(value: number, options: readonly number[]): number {
  if (options.length === 0) return value;
  if (!Number.isFinite(value)) return options[0]!;
  let best = options[0]!;
  for (const option of options) {
    if (Math.abs(option - value) < Math.abs(best - value)) best = option;
  }
  return best;
}
