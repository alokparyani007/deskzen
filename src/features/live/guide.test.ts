import { describe, expect, it } from 'vitest';
import { emptyGuide, guideLine, guideReady, shouldAutoGuide, startGuide, stepGuide, GUIDE_DONE } from './guide';

const none = { sit: false, shoulders: false, chin: false };
const all = { sit: true, shoulders: true, chin: true };

describe('Guide me back', () => {
  it('confirms a step after it holds for 1.5 seconds', () => {
    let step = startGuide(0, none, false);
    expect(step.memory.step).toBe('chin');
    expect(step.speak).toBe('Ease your head back');
    step = stepGuide(step.memory, 400, { ...none, chin: true }, false);
    expect(step.memory.step).toBe('chin');
    expect(step.memory.holdMs).toBe(400);
    expect(step.chime).toBe(false);
    step = stepGuide(step.memory, 700, none, false);
    expect(step.memory.holdMs).toBe(0);
    step = stepGuide(step.memory, 1_000, { ...none, chin: true }, false);
    step = stepGuide(step.memory, 2_500, { ...none, chin: true }, false);
    expect(step.chime).toBe(true);
    expect(step.memory.step).toBe('shoulders');
    expect(step.speak).toBe('Drop your shoulders');
    expect(step.memory.done.chin).toBe(true);
  });

  it('skips a step that is already in range and finishes the rest', () => {
    let step = startGuide(0, { sit: true, shoulders: false, chin: true }, true);
    expect(step.memory.step).toBe('shoulders');
    expect(step.skipped).toEqual(['chin']);
    expect(step.speak).toBe('Drop your shoulders');
    expect(guideLine('sit', true).title).toBe('Stand tall');
    step = stepGuide(step.memory, 1_500, { sit: true, shoulders: true, chin: true }, true);
    expect(step.memory.phase).toBe('done');
    expect(step.speak).toBe(GUIDE_DONE);
    expect(step.bounce).toBe(true);
    expect(step.chime).toBe(true);
    expect(step.skipped).toContain('sit');
    const again = stepGuide(step.memory, 2_000, all, true);
    expect(again.bounce).toBe(false);
    expect(again.speak).toBeNull();
  });

  it('finishes immediately when every step is already fine', () => {
    const step = startGuide(0, all, false);
    expect(step.memory.phase).toBe('done');
    expect(step.bounce).toBe(true);
    expect(step.skipped).toEqual(['chin', 'shoulders', 'sit']);
    expect(step.chime).toBe(false);
  });

  it('knows when a drift is inside the print range and when to auto start', () => {
    expect(guideReady({ slouch: 0.4, lean: 0.2, tooClose: 0.5, shouldersUp: 1.2, shouldersTilt: 0, headForward: 0, headDown: 0 })).toEqual({
      sit: true,
      shoulders: false,
      chin: true,
    });
    expect(shouldAutoGuide({ enabled: true, used: false, guiding: false, offSince: 0, now: 29_999, match: 60 })).toBe(false);
    expect(shouldAutoGuide({ enabled: true, used: false, guiding: false, offSince: 0, now: 30_000, match: 69 })).toBe(true);
    expect(shouldAutoGuide({ enabled: true, used: true, guiding: false, offSince: 0, now: 40_000, match: 50 })).toBe(false);
    expect(shouldAutoGuide({ enabled: false, used: false, guiding: false, offSince: 0, now: 40_000, match: 50 })).toBe(false);
    expect(emptyGuide().phase).toBe('idle');
  });
});
