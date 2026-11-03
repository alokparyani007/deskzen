import { describe, expect, it } from 'vitest';
import { noteFixedIt, noteSnooze, resetAdaptive } from './adaptive';
import { computeBaseline } from './baseline';
import { postureConfig } from './config';
import { readSignals } from './readSignals';
import { focalPxFromWidth } from './signals';
import { scoreFrame, smoothToward, usedWeights } from './score';
import { fixedIt, initialNudgeState, snoozeNudge, stepNudge } from './nudges';
import type { Baseline, Landmark, Landmarks, SignalReadings } from './types';

const width = 640;
const height = 480;

function point(x: number, y: number, visibility = 1): Landmark {
  return { x, y, visibility };
}

function poseAt(overrides: Partial<Landmarks> = {}): Landmarks {
  const { calibration } = postureConfig;
  const focal = focalPxFromWidth(width);
  const distanceMm = calibration.targetDistanceIn * 25.4;
  const irisPx = (focal * postureConfig.irisMm) / distanceMm;
  const ipdPx = (focal * postureConfig.typicalIpdMm) / distanceMm;
  const cx = width / 2;
  const eyeY = height * calibration.eyeLineYRatio;
  const shoulderY = height * calibration.shoulderLineYRatio;
  const shoulderHalf = focal * postureConfig.guideShoulderMm / distanceMm / 2;
  const earY = eyeY + (shoulderY - eyeY) * 0.35;
  return {
    timestampMs: 0,
    videoWidth: width,
    videoHeight: height,
    faceCount: 1,
    nose: point(cx, eyeY + 28),
    leftEye: point(cx - ipdPx / 2, eyeY),
    rightEye: point(cx + ipdPx / 2, eyeY),
    leftEar: point(cx - ipdPx * 0.8, earY),
    rightEar: point(cx + ipdPx * 0.8, earY),
    leftShoulder: point(cx - shoulderHalf, shoulderY),
    rightShoulder: point(cx + shoulderHalf, shoulderY),
    leftIrisCenter: point(cx - ipdPx / 2, eyeY),
    rightIrisCenter: point(cx + ipdPx / 2, eyeY),
    leftIrisDiameterPx: irisPx,
    rightIrisDiameterPx: irisPx,
    ...overrides,
  };
}

function scaleAroundCenter(sample: Landmarks, factor: number): Landmarks {
  const cx = sample.videoWidth / 2;
  const cy = sample.videoHeight / 2;
  const scale = (landmark: Landmark | undefined) =>
    landmark && { ...landmark, x: cx + (landmark.x - cx) * factor, y: cy + (landmark.y - cy) * factor };
  return {
    ...sample,
    nose: scale(sample.nose),
    leftEye: scale(sample.leftEye),
    rightEye: scale(sample.rightEye),
    leftEar: scale(sample.leftEar),
    rightEar: scale(sample.rightEar),
    leftShoulder: scale(sample.leftShoulder),
    rightShoulder: scale(sample.rightShoulder),
    leftIrisCenter: scale(sample.leftIrisCenter),
    rightIrisCenter: scale(sample.rightIrisCenter),
    leftIrisDiameterPx: (sample.leftIrisDiameterPx ?? 0) * factor,
    rightIrisDiameterPx: (sample.rightIrisDiameterPx ?? 0) * factor,
  };
}

function atResolution(sample: Landmarks, videoWidth: number, videoHeight: number): Landmarks {
  const sx = videoWidth / sample.videoWidth;
  const sy = videoHeight / sample.videoHeight;
  const scale = (landmark: Landmark | undefined) => landmark && { ...landmark, x: landmark.x * sx, y: landmark.y * sy };
  return {
    ...sample,
    videoWidth,
    videoHeight,
    nose: scale(sample.nose),
    leftEye: scale(sample.leftEye),
    rightEye: scale(sample.rightEye),
    leftEar: scale(sample.leftEar),
    rightEar: scale(sample.rightEar),
    leftShoulder: scale(sample.leftShoulder),
    rightShoulder: scale(sample.rightShoulder),
    leftIrisCenter: scale(sample.leftIrisCenter),
    rightIrisCenter: scale(sample.rightIrisCenter),
    leftIrisDiameterPx: (sample.leftIrisDiameterPx ?? 0) * sx,
    rightIrisDiameterPx: (sample.rightIrisDiameterPx ?? 0) * sx,
  };
}

function baselineFromPose(): Baseline {
  const result = computeBaseline(Array.from({ length: 12 }, (_, index) => poseAt({ timestampMs: index * 50 })));
  if (!result.ok) throw new Error(result.message);
  return result.baseline;
}

const nudgeInput = {
  threshold: 65,
  sustainMs: 30_000,
  cooldownMs: 5 * 60_000,
  snoozeMs: 15 * 60_000,
  maxPerHour: 6,
  focusQuiet: false,
};

describe('readSignals and score', () => {
  it('scores an identical pose as 100', () => {
    const baseline = baselineFromPose();
    const { readings } = readSignals(poseAt(), baseline, { movingUntilMs: 0 });
    expect(readings.quality).toBe('good');
    expect(readings.leanDev ?? 0).toBeCloseTo(0, 2);
    expect(readings.headDropDev ?? 0).toBeCloseTo(0, 2);
    expect(readings.shoulderDev ?? 0).toBeCloseTo(0, 2);
    expect(readings.tiltDevDeg ?? 0).toBeCloseTo(0, 2);
    const score = scoreFrame(readings, undefined, 0, 1);
    expect(score.smoothed).toBeGreaterThan(99);
    expect(score.label).toBe('great');
  });

  it('raises lean when the face is 15% larger', () => {
    const baseline = baselineFromPose();
    const { readings } = readSignals(scaleAroundCenter(poseAt(), 1.15), baseline, { movingUntilMs: 0 });
    expect(readings.leanDev).toBeCloseTo(0.15, 2);
    const score = scoreFrame(readings, undefined, 0, 1);
    expect(score.subScores.lean ?? 100).toBeLessThan(score.subScores.headDrop ?? 0);
    expect(score.raw).toBeLessThan(90);
  });

  it('raises head drop when the nose moves toward the shoulders', () => {
    const baseline = baselineFromPose();
    const upright = poseAt();
    const dropped = poseAt({ nose: point(upright.nose!.x, upright.nose!.y + 40) });
    const before = readSignals(upright, baseline, { movingUntilMs: 0 }).readings.headDropDev ?? 0;
    const after = readSignals(dropped, baseline, { movingUntilMs: 0 }).readings.headDropDev ?? 0;
    expect(after).toBeGreaterThan(before);
  });

  it('drops the tilt sub-score when the shoulders rotate about 10 degrees', () => {
    const baseline = baselineFromPose();
    const sample = poseAt();
    const left = sample.leftShoulder!;
    const right = sample.rightShoulder!;
    const dx = right.x - left.x;
    const dy = Math.tan((10 * Math.PI) / 180) * dx;
    const midY = (left.y + right.y) / 2;
    const tilted = poseAt({
      leftShoulder: point(left.x, midY - dy / 2),
      rightShoulder: point(right.x, midY + dy / 2),
    });
    const { readings } = readSignals(tilted, baseline, { movingUntilMs: 0 });
    expect(readings.tiltDevDeg ?? 0).toBeGreaterThan(9);
    expect(readings.tiltDevDeg ?? 0).toBeLessThan(11);
    const score = scoreFrame(readings, undefined, 0, 1);
    expect(score.subScores.tilt ?? 100).toBeLessThan(80);
  });

  it('drops the shoulder signal and re-normalizes weights when ears are missing', () => {
    const baseline = baselineFromPose();
    const { readings } = readSignals(poseAt({ leftEar: undefined, rightEar: undefined }), baseline, { movingUntilMs: 0 });
    expect(readings.shoulderDev).toBeUndefined();
    const weights = usedWeights(readings);
    expect(weights.shoulders).toBeUndefined();
    const sum = Object.values(weights).reduce((total, weight) => total + (weight ?? 0), 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('scores the same pose at 640 and 1280', () => {
    const baseline = baselineFromPose();
    const vga = poseAt();
    const hd = atResolution(vga, 1280, 720);
    const low = scoreFrame(readSignals(vga, baseline, { movingUntilMs: 0 }).readings, undefined, 0, 1);
    const high = scoreFrame(readSignals(hd, baseline, { movingUntilMs: 0 }).readings, undefined, 0, 1);
    expect(high.raw).toBeCloseTo(low.raw, 1);
    expect(high.smoothed).toBeCloseTo(low.smoothed, 1);
    expect(high.label).toBe(low.label);

    const closer = scaleAroundCenter(vga, 1.15);
    const closerHd = atResolution(closer, 1280, 720);
    const closeLow = scoreFrame(readSignals(closer, baseline, { movingUntilMs: 0 }).readings, undefined, 0, 1);
    const closeHigh = scoreFrame(readSignals(closerHd, baseline, { movingUntilMs: 0 }).readings, undefined, 0, 1);
    expect(closeHigh.raw).toBeCloseTo(closeLow.raw, 1);
    expect(closeHigh.subScores.lean).toBeCloseTo(closeLow.subScores.lean ?? 0, 1);
  });
});

describe('EMA', () => {
  it('covers about 63% of a 100 to 40 step after tau seconds at 5 and 30 fps', () => {
    const tau = postureConfig.emaTauSeconds;
    const expected = 40 + 60 * Math.exp(-1);
    for (const fps of [5, 30]) {
      const dt = 1 / fps;
      let smooth = 100;
      let elapsed = 0;
      while (elapsed < tau - 1e-9) {
        const step = Math.min(dt, tau - elapsed);
        smooth = smoothToward(smooth, 40, step);
        elapsed += step;
      }
      expect(smooth).toBeCloseTo(expected, 5);
    }
  });
});

describe('nudges', () => {
  function hold(seconds: number, good = true, start = initialNudgeState()) {
    let state = start;
    for (let second = 0; second <= seconds; second += 1) {
      state = stepNudge(state, { ...nudgeInput, nowMs: second * 1000, score: 50, good }).state;
    }
    return state;
  }

  it('stays quiet at 29 seconds and nudges at 31', () => {
    expect(hold(29).phase).toBe('below');
    expect(hold(31).phase).toBe('nudging');
  });

  it('pauses the timer on gated frames', () => {
    let state = hold(20);
    const paused = state.accumulatedBelowMs;
    for (let second = 21; second <= 30; second += 1) {
      state = stepNudge(state, { ...nudgeInput, nowMs: second * 1000, score: 50, good: false }).state;
    }
    expect(state.accumulatedBelowMs).toBe(paused);
    expect(state.phase).toBe('below');
  });

  it('respects cooldown and snooze', () => {
    const nudged = hold(31);
    const cooled = fixedIt(nudged, 31_000, nudgeInput.cooldownMs);
    expect(cooled.phase).toBe('cooldown');
    let state = cooled;
    for (let second = 32; second <= 62; second += 1) {
      state = stepNudge(state, { ...nudgeInput, nowMs: second * 1000, score: 40, good: true }).state;
    }
    expect(state.phase).toBe('cooldown');

    const snoozed = snoozeNudge(nudged, 31_000, nudgeInput.snoozeMs);
    state = snoozed;
    for (let second = 32; second <= 90; second += 1) {
      state = stepNudge(state, { ...nudgeInput, nowMs: second * 1000, score: 40, good: true }).state;
    }
    expect(state.phase).toBe('snoozed');
  });

  it('suppresses the nudge during focus', () => {
    let state = initialNudgeState();
    for (let second = 0; second <= 31; second += 1) {
      state = stepNudge(state, { ...nudgeInput, nowMs: second * 1000, score: 50, good: true, focusQuiet: true }).state;
    }
    expect(state.phase).not.toBe('nudging');
  });
});

describe('adaptive strictness', () => {
  it('lowers the threshold across three snoozes and restores defaults', () => {
    let state = resetAdaptive();
    state = noteSnooze(state, 'lean');
    state = noteSnooze(state, 'lean');
    state = noteSnooze(state, 'lean');
    expect(state.threshold).toBe(59);
    expect(state.sustainSeconds).toBe(45);
    expect(state.weightScale.lean).toBeCloseTo(0.9 ** 3, 5);
    expect(resetAdaptive().threshold).toBe(65);
  });

  it('raises the threshold after repeated fast fixes, within bounds', () => {
    let state = resetAdaptive();
    state = noteFixedIt(state, true);
    state = noteFixedIt(state, true);
    state = noteFixedIt(state, true);
    expect(state.threshold).toBe(66);
    for (let count = 0; count < 40; count += 1) state = noteFixedIt(state, true);
    expect(state.threshold).toBeLessThanOrEqual(75);
  });
});

describe('gated score updates', () => {
  it('does not move the smoothed score on a moving frame', () => {
    const readings: SignalReadings = { quality: 'good', leanDev: 0, headDropDev: 0, shoulderDev: 0, tiltDevDeg: 0, distDev: 0 };
    const first = scoreFrame(readings, undefined, 0, 1);
    const held = scoreFrame({ quality: 'moving' }, { ...first, smoothed: 100, raw: 100 }, 1, 0.4);
    expect(held.smoothed).toBe(100);
    expect(held.quality).toBe(0.4);
  });
});
