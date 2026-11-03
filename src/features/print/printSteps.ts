/** Sitting Posture Print, in order. Headers use this so the count stays honest. */
export const PRINT_FLOW = ['Setup', 'Body reset', 'Lock', 'Catch Me', 'Glow-up'] as const;

export type PrintStepName = (typeof PRINT_FLOW)[number];

export function printStepLabel(name: PrintStepName): string {
  const index = PRINT_FLOW.indexOf(name);
  return `Step ${index + 1} of ${PRINT_FLOW.length}`;
}

/** Home is the default. Settings and Live view come back to themselves. */
export function printReturnPath(from: string | null): string {
  if (from === 'settings') return '/settings';
  if (from === 'live') return '/live';
  return '/app';
}
