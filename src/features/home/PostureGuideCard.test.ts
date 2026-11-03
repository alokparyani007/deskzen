import { describe, expect, it } from 'vitest';
import { GUIDE_ALT, guideOpen } from './PostureGuideCard';

describe('posture guide card', () => {
  it('opens and closes the lightbox', () => {
    expect(guideOpen(false, 'open')).toBe(true);
    expect(guideOpen(true, 'close')).toBe(false);
    expect(GUIDE_ALT).toBe('Good desk posture guide for sitting and standing.');
  });
});
