import { describe, expect, it } from 'vitest';
import {
  holdComplete,
  holdCountdown,
  meterFromAmount,
  showSlouchFallback,
  skipCatchResult,
  slouchCaptureDecision,
  slouchChecklist,
  SLOUCH_HOLD_MS,
  smoothMeter,
} from './catchMeter';

describe('slouch meter', () => {
  it('maps the amount onto 0..1 and clamps the ends', () => {
    expect(meterFromAmount(0, 3)).toBe(0);
    expect(meterFromAmount(1.5, 3)).toBeCloseTo(0.5);
    expect(meterFromAmount(3, 3)).toBe(1);
    expect(meterFromAmount(-2, 3)).toBe(0);
    expect(meterFromAmount(9, 3)).toBe(1);
    expect(meterFromAmount(1, 0)).toBe(0);
    expect(meterFromAmount(Number.NaN, 3)).toBe(0);
  });

  it('smooths with an EMA of 0.25 and stays inside 0..1', () => {
    expect(smoothMeter(null, 2)).toBe(1);
    expect(smoothMeter(0, 1)).toBeCloseTo(0.25);
    expect(smoothMeter(0.2, 1)).toBeCloseTo(0.4);
  });

  it('holds for 2 seconds and counts 2, then 1', () => {
    expect(SLOUCH_HOLD_MS).toBe(2_000);
    expect(holdComplete(SLOUCH_HOLD_MS - 1)).toBe(false);
    expect(holdComplete(SLOUCH_HOLD_MS)).toBe(true);
    expect(holdCountdown(0)).toBe(2);
    expect(holdCountdown(1_000)).toBe(1);
    expect(holdCountdown(1_999)).toBe(1);
  });

  it('offers the current max after 15 seconds without a finished hold', () => {
    expect(showSlouchFallback(14_999, false, false)).toBe(false);
    expect(showSlouchFallback(15_000, false, false)).toBe(true);
    expect(showSlouchFallback(15_000, true, false)).toBe(false);
    expect(showSlouchFallback(20_000, false, true)).toBe(false);
  });

  it('skip keeps the default thresholds', () => {
    expect(skipCatchResult()).toEqual({ frames: [], detected: false });
    expect(slouchChecklist(true)).toBe('Slouch: using default');
    expect(slouchChecklist(false)).toBe("Slouch learned - we'll nudge you early");
  });

  it('saves the button frame, and keeps the default when skipped or under 25%', () => {
    expect(slouchCaptureDecision({ source: 'button', meter: 0.1, frameCount: 1 })).toEqual({ detected: true });
    expect(slouchCaptureDecision({ source: 'enough', meter: 0.4, frameCount: 3 })).toEqual({ detected: true });
    expect(slouchCaptureDecision({ source: 'enough', meter: 0.39, frameCount: 3 })).toEqual({ detected: false });
    expect(slouchCaptureDecision({ source: 'enough', meter: 0.8, frameCount: 0 })).toEqual({ detected: false });
    expect(slouchCaptureDecision({ source: 'skip', meter: 0.9, frameCount: 4 })).toEqual({ detected: false });
    expect(slouchCaptureDecision({ source: 'timeout', meter: 0.2, frameCount: 2 })).toEqual({ detected: false });
    expect(slouchCaptureDecision({ source: 'timeout', meter: 0.25, frameCount: 2 })).toEqual({ detected: true });
  });
});
