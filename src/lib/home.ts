export type HomeSnapshot = {
  name: string;
  score: number;
  scoreLabel: string;
  scoreNote: string;
  sittingLabel: string;
  breaks: number;
  waterCups: number;
  sittingMinutes: number;
  weekly: readonly { day: string; score: number }[];
  empty?: boolean;
  postureLabel?: string;
  breakDue?: boolean;
  cameraLive?: boolean;
};

/** Static stand-in until local scores exist. Score is a whole number, never a percent. */
export const homePlaceholder: HomeSnapshot = {
  name: 'Alok',
  score: 84,
  scoreLabel: 'Good',
  scoreNote: 'Keep it up',
  sittingLabel: '3h 10m',
  breaks: 5,
  waterCups: 4,
  sittingMinutes: 45,
  weekly: [
    { day: 'Mon', score: 62 },
    { day: 'Tue', score: 68 },
    { day: 'Wed', score: 92 },
    { day: 'Thu', score: 80 },
    { day: 'Fri', score: 64 },
    { day: 'Sat', score: 52 },
    { day: 'Sun', score: 58 },
  ],
};

export function formatScore(score: number): string {
  if (!Number.isFinite(score)) {
    return '0';
  }
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return String(clamped);
}

export function greetingForHour(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
}
