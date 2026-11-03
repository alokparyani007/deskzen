import { describe, expect, it } from 'vitest';
import { beginGuide, initialLiveCoach, poseIsVisible, stepLiveCoach } from './liveCoach2';

describe('live coach', () => {
  it('never says step into view while a pose is visible, even with two faces', () => {
    let state = initialLiveCoach(0);
    for (const now of [0, 1000, 3000, 8000]) {
      const view = stepLiveCoach(state, {
        nowMs: now,
        fit: 90,
        poseVisible: true,
        faceCount: 2,
        framing: 'Just you in the frame, please',
        tipId: null,
        tipTitle: null,
      });
      state = view.state;
      expect(view.stepIntoView).toBe(false);
    }
    expect(poseIsVisible({ nose: 0.4 })).toBe(true);
  });

  it('waits two seconds with no pose before step into view', () => {
    let state = initialLiveCoach(0);
    const early = stepLiveCoach(state, { nowMs: 0, fit: null, poseVisible: false, faceCount: 0, framing: null, tipId: null, tipTitle: null });
    state = early.state;
    const still = stepLiveCoach(state, { nowMs: 1999, fit: null, poseVisible: false, faceCount: 0, framing: null, tipId: null, tipTitle: null });
    expect(still.stepIntoView).toBe(false);
    const away = stepLiveCoach(still.state, { nowMs: 2000, fit: null, poseVisible: false, faceCount: 0, framing: null, tipId: null, tipTitle: null });
    expect(away.stepIntoView).toBe(true);
    const back = stepLiveCoach(away.state, { nowMs: 2100, fit: 90, poseVisible: true, faceCount: 1, framing: null, tipId: null, tipTitle: null });
    expect(back.stepIntoView).toBe(false);
  });

  it('drifts after 3 seconds under 80 and recovers after 1 second at 85', () => {
    let state = initialLiveCoach(0);
    let view = stepLiveCoach(state, { nowMs: 0, fit: 70, poseVisible: true, faceCount: 1, framing: null, tipId: 'L-neck', tipTitle: 'Sit tall' });
    view = stepLiveCoach(view.state, { nowMs: 2999, fit: 70, poseVisible: true, faceCount: 1, framing: null, tipId: 'L-neck', tipTitle: 'Sit tall' });
    expect(view.phase).toBe('ontrack');
    view = stepLiveCoach(view.state, { nowMs: 3000, fit: 70, poseVisible: true, faceCount: 1, framing: null, tipId: 'L-neck', tipTitle: 'Sit tall' });
    expect(view.phase).toBe('drifting');
    expect(view.speak).toBe('Sit tall');
    view = stepLiveCoach(view.state, { nowMs: 10_000, fit: 90, poseVisible: true, faceCount: 1, framing: null, tipId: null, tipTitle: null });
    expect(view.phase).toBe('drifting');
    view = stepLiveCoach(view.state, { nowMs: 11_000, fit: 90, poseVisible: true, faceCount: 1, framing: null, tipId: 'back', tipTitle: "Nice, that's your Zen." });
    expect(view.phase).toBe('ontrack');
    expect(view.speak).toBe("Nice, that's your Zen.");
  });

  it('holds a framing pill for 2 seconds and clears it immediately', () => {
    let view = stepLiveCoach(initialLiveCoach(0), {
      nowMs: 0,
      fit: 90,
      poseVisible: true,
      faceCount: 1,
      framing: 'Show both shoulders',
      tipId: null,
      tipTitle: null,
    });
    expect(view.framingPill).toBeNull();
    view = stepLiveCoach(view.state, { nowMs: 2000, fit: 90, poseVisible: true, faceCount: 1, framing: 'Show both shoulders', tipId: null, tipTitle: null });
    expect(view.framingPill).toBe('Show both shoulders');
    view = stepLiveCoach(view.state, { nowMs: 2100, fit: 90, poseVisible: true, faceCount: 1, framing: null, tipId: null, tipTitle: null });
    expect(view.framingPill).toBeNull();
  });

  it('does not repeat a tip inside 20 seconds', () => {
    let view = stepLiveCoach(initialLiveCoach(0), { nowMs: 0, fit: 70, poseVisible: true, faceCount: 1, framing: null, tipId: 'L-neck', tipTitle: 'Sit tall' });
    view = stepLiveCoach(view.state, { nowMs: 3000, fit: 70, poseVisible: true, faceCount: 1, framing: null, tipId: 'L-neck', tipTitle: 'Sit tall' });
    expect(view.speak).toBe('Sit tall');
    const again = beginGuide(view.state, 11_000, 'L-neck', 'Sit tall');
    expect(again.speak).toBeNull();
    const later = beginGuide(again.state, 24_000, 'L-neck', 'Sit tall');
    expect(later.speak).toBe('Sit tall');
  });
});
