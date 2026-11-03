import { describe, expect, it } from 'vitest';
import { postureConfig } from './config';
import {
  elbowAngleDeg,
  elbowHint,
  hipLean,
  initialMode,
  initialStandingWatch,
  meanElbowAngle,
  stepPostureMode,
  type ModeState,
} from './standing';
import type { Baseline, Landmarks, Point2D } from './types';

const point = (x: number, y: number): Point2D => ({ x, y });

describe('sit and stand detection', () => {
  const sittingPose = person({ eyeY: 190, shoulderY: 310 });
  const standingPose = person({ eyeY: 120, shoulderY: 210, ipd: 40, hipY: 430, hipVis: 0.9 });
  const sitBase = baselineFrom(sittingPose, 'sit');
  const standBase = baselineFrom(standingPose, 'stand');

  it('stays sitting for a recorded sitting pose, including when the hips are hidden', () => {
    const state = hold(initialMode(), sittingPose, sitBase, standBase, postureConfig.standing.switchMs + 500);
    expect(state.signals.hipsVisible).toBe(false);
    expect(state.signals.confidence).toBeLessThan(postureConfig.standing.standConfidence);
    expect(state.mode).toBe('sitting');
  });

  it('stays sitting when she leans forward', () => {
    const leaning = person({ eyeY: 220, shoulderY: 310, ipd: 78 });
    const state = hold(initialMode(), leaning, sitBase, standBase, postureConfig.standing.switchMs + 500);
    expect(state.mode).toBe('sitting');
    expect(state.signals.confidence).toBeLessThan(postureConfig.standing.standConfidence);
  });

  it('does not treat a camera that rises with the desk as standing', () => {
    let state = step(initialMode(), sittingPose, sitBase, standBase, 0);
    state = step(state, sittingPose, sitBase, standBase, 200);
    const jumped = shiftY(sittingPose, -80);
    state = step(state, jumped, sitBase, standBase, 280);
    expect(state.signals.cameraMoved).toBe(true);
    state = hold(state, jumped, sitBase, standBase, postureConfig.standing.switchMs + 1000, 280);
    expect(state.mode).toBe('sitting');
    expect(state.signals.confidence).toBeLessThan(postureConfig.standing.standConfidence);
  });

  it('switches to standing only after confidence stays high for 8 seconds', () => {
    const early = hold(initialMode(), standingPose, sitBase, standBase, postureConfig.standing.switchMs - 500);
    expect(early.signals.confidence).toBeGreaterThan(postureConfig.standing.standConfidence);
    expect(early.signals.hipsVisible).toBe(true);
    expect(early.mode).toBe('sitting');
    const later = hold(early, standingPose, sitBase, standBase, postureConfig.standing.switchMs + 200, postureConfig.standing.switchMs - 500);
    expect(later.mode).toBe('standing');
  });

  it('can notice standing from hips and torso when no standing baseline exists', () => {
    const state = hold(initialMode(), standingPose, sitBase, null, 1000);
    expect(state.signals.baseline).toBeNull();
    expect(state.signals.hipsVisible).toBe(true);
    expect(state.signals.confidence).toBeGreaterThan(postureConfig.standing.sitConfidence);
  });
});

function hold(state: ModeState, marks: Landmarks, sitting: Baseline | null, standing: Baseline | null, until: number, from = 0): ModeState {
  let next = state;
  for (let time = from; time <= until; time += 500) next = step(next, marks, sitting, standing, time);
  return next;
}

function step(state: ModeState, marks: Landmarks, sitting: Baseline | null, standing: Baseline | null, nowMs: number): ModeState {
  return stepPostureMode(state, { nowMs, auto: true, landmarks: marks, sitting, standing, today: '2026-10-25', suggestDay: null });
}

function person(input: { eyeY: number; shoulderY: number; ipd?: number; hipY?: number; hipVis?: number }): Landmarks {
  const ipd = input.ipd ?? 48;
  const hip = input.hipY === undefined ? undefined : { y: input.hipY, visibility: input.hipVis ?? 0.2 };
  return {
    timestampMs: 0,
    videoWidth: 640,
    videoHeight: 480,
    faceCount: 1,
    nose: { x: 320, y: input.eyeY + 16, visibility: 1 },
    leftEye: { x: 320 - ipd / 2, y: input.eyeY, visibility: 1 },
    rightEye: { x: 320 + ipd / 2, y: input.eyeY, visibility: 1 },
    leftShoulder: { x: 240, y: input.shoulderY, visibility: 1 },
    rightShoulder: { x: 400, y: input.shoulderY, visibility: 1 },
    leftHip: hip ? { x: 260, y: hip.y, visibility: hip.visibility } : undefined,
    rightHip: hip ? { x: 380, y: hip.y, visibility: hip.visibility } : undefined,
  };
}

function shiftY(marks: Landmarks, dy: number): Landmarks {
  const move = (point: Landmarks['nose']) => (point ? { ...point, y: point.y + dy } : undefined);
  return {
    ...marks,
    nose: move(marks.nose),
    leftEye: move(marks.leftEye),
    rightEye: move(marks.rightEye),
    leftShoulder: move(marks.leftShoulder),
    rightShoulder: move(marks.rightShoulder),
    leftHip: move(marks.leftHip),
    rightHip: move(marks.rightHip),
  };
}

function baselineFrom(marks: Landmarks, pose: 'sit' | 'stand'): Baseline {
  const ipd = Math.hypot((marks.rightEye?.x ?? 0) - (marks.leftEye?.x ?? 0), (marks.rightEye?.y ?? 0) - (marks.leftEye?.y ?? 0));
  const width = Math.hypot((marks.rightShoulder?.x ?? 0) - (marks.leftShoulder?.x ?? 0), 0);
  const norm = (point: { x: number; y: number }) => ({ x: point.x / marks.videoWidth, y: point.y / marks.videoHeight });
  return {
    version: 1,
    createdAt: '2026-10-25T12:00:00.000Z',
    ipdPx: ipd,
    headDropNorm: 1,
    shrugNorm: 1,
    roundNorm: 1,
    shoulderAngleDeg: 0,
    eyeAngleDeg: 0,
    shoulderWidthPx: width,
    focalPx: 500,
    screenDistanceIn: 24,
    videoWidth: marks.videoWidth,
    videoHeight: marks.videoHeight,
    nose: norm(marks.nose ?? { x: 0, y: 0 }),
    leftEye: norm(marks.leftEye ?? { x: 0, y: 0 }),
    rightEye: norm(marks.rightEye ?? { x: 0, y: 0 }),
    leftShoulder: norm(marks.leftShoulder ?? { x: 0, y: 0 }),
    rightShoulder: norm(marks.rightShoulder ?? { x: 0, y: 0 }),
    pose,
  };
}

describe('elbow angle and hip lean', () => {
  it('reads a right angle and the desk hints', () => {
    expect(elbowAngleDeg(point(0, 0), point(0, 10), point(10, 10))).toBeCloseTo(90, 5);
    expect(elbowHint(90)).toBeNull();
    expect(elbowHint(170)).toBe('raise');
    expect(elbowHint(40)).toBe('lower');
  });

  it('notices a leaned hip when the shoulders tilt and shift', () => {
    const landmarks = {
      videoWidth: 640,
      videoHeight: 480,
      leftShoulder: { x: 100, y: 100, visibility: 1 },
      rightShoulder: { x: 200, y: 140, visibility: 1 },
      leftHip: { x: 120, y: 220, visibility: 1 },
      rightHip: { x: 150, y: 220, visibility: 1 },
    } as Landmarks;
    expect(hipLean(landmarks).active).toBe(true);
    expect(meanElbowAngle(landmarks)).toBeNull();
  });

  it('stays quiet when the shoulders are level over the hips', () => {
    const landmarks = {
      videoWidth: 640,
      videoHeight: 480,
      leftShoulder: { x: 100, y: 100, visibility: 1 },
      rightShoulder: { x: 200, y: 100, visibility: 1 },
      leftHip: { x: 110, y: 220, visibility: 1 },
      rightHip: { x: 190, y: 220, visibility: 1 },
    } as Landmarks;
    expect(hipLean(landmarks).active).toBe(false);
    expect(initialStandingWatch().stillMs).toBe(0);
  });
});
