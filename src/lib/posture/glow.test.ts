import { describe, expect, it } from 'vitest';
import { medianBaselines, setupChanged } from './glow';
import { holdProgress, initialHold, stepHold } from './calibrationHold';
import { postureConfig } from './config';
import type { Baseline, Landmarks } from './types';

function baseline(screenDistanceIn: number, ipdPx: number): Baseline {
  return {
    version: 1,
    createdAt: `2026-10-25T00:00:0${ipdPx}.000Z`,
    ipdPx,
    headDropNorm: 1,
    shrugNorm: 1,
    roundNorm: 1,
    shoulderAngleDeg: 0,
    eyeAngleDeg: 0,
    shoulderWidthPx: 100,
    focalPx: 500,
    screenDistanceIn,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 0.5, y: 0.4 },
    leftEye: { x: 0.45, y: 0.36 },
    rightEye: { x: 0.55, y: 0.36 },
    leftShoulder: { x: 0.35, y: 0.58 },
    rightShoulder: { x: 0.65, y: 0.58 },
  };
}

describe('median glow baseline', () => {
  it('uses the middle sample so one odd reading does not win', () => {
    const saved = medianBaselines([baseline(20, 90), baseline(24, 100), baseline(30, 140)]);
    expect(saved.screenDistanceIn).toBe(24);
    expect(saved.ipdPx).toBe(100);
  });
});

describe('setup change', () => {
  it('asks for a new Glow when the face scale shifts more than 15%', () => {
    expect(setupChanged(100, 116)).toBe(true);
    expect(setupChanged(100, 84)).toBe(true);
    expect(setupChanged(100, 110)).toBe(false);
    expect(setupChanged(100, 90)).toBe(false);
  });
});

describe('hold ring', () => {
  const frame = (timestampMs: number): Landmarks => ({ timestampMs }) as Landmarks;

  it('pauses instead of resetting on a short drift, then completes the 5 second ring', () => {
    const hold = postureConfig.calibration.holdMs;
    expect(hold).toBe(5000);
    let state = initialHold('glow');
    for (let time = 0; time <= 2000; time += 100) state = stepHold(state, frame(time), true, time, hold);
    state = stepHold(state, frame(2100), false, 2100, hold);
    state = stepHold(state, frame(3000), false, 3000, hold);
    expect(state.phase).toBe('paused');
    expect(holdProgress(state, hold)).toBeCloseTo(2000 / hold, 2);
    for (let time = 3100; time <= 3100 + hold; time += 100) state = stepHold(state, frame(time), true, time, hold);
    expect(state.phase).toBe('done');
  });
});
