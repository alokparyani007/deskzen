import { describe, expect, it } from 'vitest';
import type { NormPoint } from '../../lib/posture/types';
import { coachCaption, formatTrackLabel, liveCaption, raisedShoulder, stepIntoViewHelper, stepTrackClock } from './liveCaption';
import type { RuleResult } from './poseRules';

function rule(id: string): RuleResult {
  return { id, chip: 'tall', pass: false, value: 1, deviation: 1 };
}

function rise(span: number, deg: number): number {
  return span * Math.tan((deg * Math.PI) / 180);
}

describe('raised shoulder', () => {
  const span = 0.24;
  const savedLeft = { x: 0.62, y: 0.58 };
  const savedRight = { x: 0.38, y: 0.58 };

  it('names the person\'s right shoulder when it rises, whichever side of the image it is on', () => {
    const lifted: NormPoint = { x: savedRight.x, y: savedRight.y - rise(span, 8) };
    expect(raisedShoulder(savedLeft, lifted, savedLeft, savedRight)).toBe('right');
    const flippedLeft = { x: 0.38, y: 0.58 };
    const flippedRight = { x: 0.62, y: 0.58 - rise(span, 8) };
    expect(raisedShoulder(flippedLeft, flippedRight, { x: 0.38, y: 0.58 }, { x: 0.62, y: 0.58 })).toBe('right');
  });

  it('names the left shoulder when that side rises', () => {
    const lifted: NormPoint = { x: savedLeft.x, y: savedLeft.y - rise(span, 8) };
    expect(raisedShoulder(lifted, savedRight, savedLeft, savedRight)).toBe('left');
  });

  it('stays quiet within 5 degrees of the saved tilt', () => {
    const slight: NormPoint = { x: savedRight.x, y: savedRight.y - rise(span, 4) };
    expect(raisedShoulder(savedLeft, slight, savedLeft, savedRight)).toBeNull();
    const savedHigh = { x: savedRight.x, y: savedRight.y - rise(span, 3) };
    const liveHigh = { x: savedRight.x, y: savedRight.y - rise(span, 6) };
    expect(raisedShoulder(savedLeft, liveHigh, savedLeft, savedHigh)).toBeNull();
    const wellPast = { x: savedRight.x, y: savedRight.y - rise(span, 9) };
    expect(raisedShoulder(savedLeft, wellPast, savedLeft, savedHigh)).toBe('right');
  });
});

describe('live captions', () => {
  it('uses the mockup lines for a tall sit and a raised shoulder', () => {
    expect(liveCaption(rule('L-neck'), 'sit', null)).toBe('Sit tall, lift your head back up');
    expect(liveCaption(rule('L-drop'), 'stand', null)).toBe('Stand tall, lift your head back up');
    expect(liveCaption(null, 'stand', null)).toBe('Stand back into your outline');
    expect(liveCaption(null, 'sit', null)).toBe('Sit back into your outline');
    expect(stepIntoViewHelper('stand')).toBe('Stand where the camera can see your head and shoulders.');
    expect(stepIntoViewHelper('sit')).toBe('Sit where the camera can see your head and shoulders.');
    expect(liveCaption(rule('L-tilt'), 'sit', 'right')).toBe('Relax your right shoulder down');
    expect(liveCaption(rule('L-tilt'), 'sit', 'left')).toBe('Relax your left shoulder down');
  });

  it('shows one tip, and the on-track line when nothing is off', () => {
    expect(coachCaption({ away: false, drifting: false, guiding: false, mode: 'sit', worst: null, shoulder: null })).toEqual({
      text: "Nice, you're in your Zen",
      loud: false,
    });
    expect(coachCaption({ away: false, drifting: true, guiding: false, mode: 'sit', worst: rule('L-neck'), shoulder: 'right' }).text).toBe(
      'Sit tall, lift your head back up',
    );
    expect(coachCaption({ away: false, drifting: true, guiding: false, mode: 'sit', worst: rule('L-tilt'), shoulder: 'right' })).toEqual({
      text: 'Relax your right shoulder down',
      loud: true,
    });
    expect(coachCaption({ away: false, drifting: false, guiding: false, mode: 'sit', worst: rule('L-neck'), shoulder: 'right' }).text).toBe(
      'Sit tall, lift your head back up',
    );
    expect(coachCaption({ away: true, drifting: false, guiding: false, mode: 'sit', worst: null, shoulder: null }).text).toBe('Step into view');
  });
});

describe('track clock', () => {
  it('counts on-track minutes and drift seconds, and restarts when the kind changes', () => {
    expect(formatTrackLabel('ontrack', 12_000)).toBe('On track · 12 s');
    expect(formatTrackLabel('ontrack', 12 * 60_000)).toBe('On track · 12 min');
    expect(formatTrackLabel('drifting', 4_000)).toBe('Drifting · 4 s');
    const first = stepTrackClock(null, 'ontrack', 1_000);
    const still = stepTrackClock(first.clock, 'ontrack', 13_000);
    expect(still.label).toBe('On track · 12 s');
    const drift = stepTrackClock(still.clock, 'drifting', 13_500);
    expect(drift.label).toBe('Drifting · 0 s');
    expect(stepTrackClock(drift.clock, 'drifting', 17_500).label).toBe('Drifting · 4 s');
    expect(stepTrackClock(drift.clock, null, 18_000)).toEqual({ clock: null, label: null });
  });
});
