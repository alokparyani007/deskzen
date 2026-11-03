import { describe, expect, it } from 'vitest';
import { calibrationChips, calibrationCue } from './calibrationCue';
import { holdProgress, initialHold, stepHold } from './calibrationHold';
import { smoothLandmarks } from './smoothLandmarks';
import { postureConfig } from './config';
import type { Alignment, Landmarks } from './types';

function alignment(options: {
  center?: boolean;
  eyes?: boolean;
  shoulders?: boolean;
  headStack?: boolean;
  distance?: boolean;
  distanceIn?: number | null;
  coaching?: string | null;
}): Alignment {
  const flag = (id: Alignment['guides'][number]['id'], aligned = false) => ({ id, label: id, aligned, detail: '' });
  return {
    guides: [
      flag('center', options.center),
      flag('eyes', options.eyes),
      flag('shoulders', options.shoulders),
      flag('headStack', options.headStack),
      flag('distance', options.distance),
    ],
    allGreen: Boolean(options.center && options.eyes && options.shoulders && options.headStack && options.distance),
    coaching: options.coaching ?? null,
    distanceIn: options.distanceIn === undefined ? 25 : options.distanceIn,
  };
}

const ready = { center: true, eyes: true, shoulders: true, headStack: true, distance: true, distanceIn: 25 };

describe('calibration cue', () => {
  it('keeps a single tip in priority order', () => {
    expect(calibrationCue(null)).toBe('Move into the outline');
    expect(calibrationCue(alignment({ ...ready, center: false }))).toBe('Move into the outline');
    expect(calibrationCue(alignment({ ...ready, distanceIn: 12, distance: false }))).toBe('Sit back a little');
    expect(calibrationCue(alignment({ ...ready, distanceIn: 40, distance: false }))).toBe('Come a bit closer');
    expect(calibrationCue(alignment({ ...ready, eyes: false }))).toBe('Lift your chin');
    expect(calibrationCue(alignment({ ...ready, shoulders: false }))).toBe('Relax your shoulders');
    expect(calibrationCue(alignment(ready))).toBe('Perfect, hold still');
  });

  it('reports position, level, and distance without a checklist', () => {
    expect(calibrationChips(alignment(ready))).toEqual({ position: true, level: true, distance: true });
    expect(calibrationChips(alignment({ ...ready, center: false, eyes: false }))).toEqual({
      position: false,
      level: false,
      distance: true,
    });
  });
});

describe('forgiving hold', () => {
  const frame = (timestampMs: number): Landmarks => ({ timestampMs }) as Landmarks;

  it('fills the ring and pauses through a brief drift', () => {
    const hold = postureConfig.calibration.holdMs;
    let state = initialHold('a');
    for (let time = 0; time <= 1000; time += 100) state = stepHold(state, frame(time), true, time);
    expect(state.accumulatedMs).toBe(1000);
    state = stepHold(state, frame(1200), false, 1200);
    state = stepHold(state, frame(2600), false, 2600);
    expect(state.phase).toBe('paused');
    expect(holdProgress(state)).toBeCloseTo(1000 / hold, 2);
    state = stepHold(state, frame(2600), true, 2600);
    expect(state.accumulatedMs).toBe(1000);
    for (let time = 2700; time <= 2700 + hold; time += 100) state = stepHold(state, frame(time), true, time);
    expect(state.phase).toBe('done');
  });

  it('resets only after the drift lasts 1.5 seconds', () => {
    let state = initialHold('a');
    for (let time = 0; time <= 1000; time += 100) state = stepHold(state, frame(time), true, time);
    state = stepHold(state, frame(1100), false, 1100);
    state = stepHold(state, frame(1100 + postureConfig.calibration.driftResetMs), false, 1100 + postureConfig.calibration.driftResetMs);
    expect(state.phase).toBe('idle');
    expect(state.accumulatedMs).toBe(0);
  });
});

describe('smoothed landmarks', () => {
  it('moves part of the way toward a new point after one time constant', () => {
    const tau = postureConfig.calibration.smoothTauSeconds;
    const previous = {
      timestampMs: 0,
      videoWidth: 100,
      videoHeight: 100,
      faceCount: 1,
      nose: { x: 0, y: 0, visibility: 1 },
    } as Landmarks;
    const next = { ...previous, timestampMs: tau * 1000, nose: { x: 10, y: 0, visibility: 1 } };
    const smoothed = smoothLandmarks(previous, next);
    expect(smoothed.nose?.x).toBeCloseTo(10 * (1 - Math.exp(-1)), 5);
  });
});
