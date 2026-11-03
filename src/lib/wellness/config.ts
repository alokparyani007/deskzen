/**
 * Starting values for sit-stand intervals and wellness reminders.
 * Not validated constants. Tune with real days at the desk.
 */
export const wellnessConfig = {
  presets: {
    balanced: { sit: 20, stand: 8, move: 2 },
    easy: { sit: 45, stand: 15, move: 0 },
    focus: { sit: 50, stand: 10, move: 0 },
  },
  snoozeMs: 10 * 60 * 1000,
  renudgeMs: 5 * 60 * 1000,
  busyDelayMs: 10 * 60 * 1000,
  eyeRestMinutes: 20,
  waterMinutes: 60,
  dailySwitchGoal: 6,
  /** Dev-only faster clock. Real minutes are unchanged when this is off. */
  devSpeed: 10,
} as const;
