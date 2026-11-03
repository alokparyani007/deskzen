export const CATCH_HISTORY_MS = 5_000;
export const CATCH_AUTO_FINISH_MS = 10_000;

export function trimCatchHistory<T extends { tMs: number }>(samples: T[], nowMs: number, windowMs = CATCH_HISTORY_MS): T[] {
  return samples.filter((sample) => nowMs - sample.tMs <= windowMs);
}

export function catchAutoFinish(sinceCaughtMs: number): boolean {
  return sinceCaughtMs >= CATCH_AUTO_FINISH_MS;
}

export function catchMeterWord(amount: number, trigger: number): 'Upright' | 'A little' | 'Almost' | 'Got it!' {
  if (trigger <= 0) return 'Upright';
  if (amount >= trigger) return 'Got it!';
  if (amount >= trigger * 0.66) return 'Almost';
  if (amount >= trigger * 0.33) return 'A little';
  return 'Upright';
}

export function skipCatchResult(): { frames: []; detected: false } {
  return { frames: [], detected: false };
}

/** How long the user holds a slouch past 40% before it is saved. */
export const SLOUCH_HOLD_MS = 2_000;
/** Offer the current max when the target has not been held. */
export const SLOUCH_FALLBACK_MS = 15_000;
/** Pause on the learned line, then continue. */
export const SLOUCH_DONE_MS = 1_000;
export const SLOUCH_METER_EMA = 0.25;

export const SLOUCH_COPY = {
  more: 'Slump a bit more',
  hold: 'Got it - hold 2 more seconds',
  done: 'Slouch learned ✓',
  out: 'Step back into view',
  fallback: "That's my slouch",
  learned: "Slouch learned - we'll nudge you early",
  skipped: 'Slouch: using default',
} as const;

/** Map a slouch amount onto 0..1 against the saved best posture. */
export function meterFromAmount(amount: number, target: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(target) || target <= 0) return 0;
  return clampUnit(amount / target);
}

/** EMA. Alpha 0.25 keeps the meter smooth without freezing it. */
export function smoothMeter(previous: number | null, sample: number, alpha = SLOUCH_METER_EMA): number {
  const next = clampUnit(sample);
  if (previous === null || !Number.isFinite(previous)) return next;
  return clampUnit(previous + alpha * (next - previous));
}

export function holdComplete(heldMs: number, holdMs = SLOUCH_HOLD_MS): boolean {
  return heldMs >= holdMs;
}

/** Whole seconds left in the 2 second hold: 2, then 1. */
export function holdCountdown(heldMs: number, holdMs = SLOUCH_HOLD_MS): 2 | 1 {
  const left = Math.max(0, holdMs - Math.max(0, heldMs));
  return Math.ceil(left / 1_000) <= 1 ? 1 : 2;
}

/** The 15s escape appears only before the hold is underway or finished. */
export function showSlouchFallback(elapsedMs: number, holding: boolean, done: boolean, fallbackMs = SLOUCH_FALLBACK_MS): boolean {
  return elapsedMs >= fallbackMs && !holding && !done;
}

export function slouchStatusLine(status: 'out' | 'more' | 'hold' | 'done'): (typeof SLOUCH_COPY)['more' | 'hold' | 'done' | 'out'] {
  if (status === 'out') return SLOUCH_COPY.out;
  if (status === 'hold') return SLOUCH_COPY.hold;
  if (status === 'done') return SLOUCH_COPY.done;
  return SLOUCH_COPY.more;
}

/** Skip stores no slouch, so the print keeps the default nudge thresholds. */
export function slouchChecklist(skipped: boolean): string {
  return skipped ? SLOUCH_COPY.skipped : SLOUCH_COPY.learned;
}

/**
 * The button saves the current frame. A hold past 40% saves too.
 * Skip, or a 15s timeout under 25%, keeps the default.
 */
export function slouchCaptureDecision(input: { source: 'skip' | 'enough' | 'button' | 'timeout'; meter: number; frameCount: number }): { detected: boolean } {
  if (input.source === 'skip' || input.frameCount < 1) return { detected: false };
  if (input.source === 'button') return { detected: true };
  if (input.source === 'timeout') return { detected: input.meter >= 0.25 };
  return { detected: input.meter >= 0.4 };
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
