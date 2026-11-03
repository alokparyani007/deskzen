import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../lib/posture/types';
import { advanceLockFill, lockMaySave, lockView, measureLockPose, movingMatch, type LockAfter } from './lockCoach';

function pose(extra: Partial<Landmarks> = {}): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 320, y: 180, visibility: 1 },
    leftEye: { x: 300, y: 160, visibility: 1 },
    rightEye: { x: 340, y: 160, visibility: 1 },
    leftEar: { x: 280, y: 175, visibility: 1 },
    rightEar: { x: 360, y: 175, visibility: 1 },
    leftShoulder: { x: 220, y: 340, visibility: 1 },
    rightShoulder: { x: 420, y: 340, visibility: 1 },
    pitchDeg: 0,
    ...extra,
  };
}

function afterFrom(frame: Landmarks): LockAfter {
  const measured = measureLockPose(frame);
  if (!measured || measured.faceRatio === null || measured.shoulderGap === null || measured.forwardHead === null) {
    throw new Error('pose');
  }
  return {
    shoulderY: measured.shoulderY,
    faceRatio: measured.faceRatio,
    shoulderGap: measured.shoulderGap,
    forwardHead: measured.forwardHead,
  };
}

describe('lock coaching', () => {
  it('passes all 4 checks for an upright relaxed pose and fills in 5 seconds', () => {
    const frame = pose();
    const view = lockView(measureLockPose(frame), afterFrom(frame));
    expect(view.ready).toBe(true);
    expect(view.passed).toBe(4);
    expect(advanceLockFill(0, 5_000, true)).toBe(1);
  });

  it('asks for a chin glide when the head is forward', () => {
    const frame = pose();
    const after = afterFrom(frame);
    const forward = pose({ leftEye: { x: 298, y: 160, visibility: 1 }, rightEye: { x: 342, y: 160, visibility: 1 } });
    const view = lockView(measureLockPose(forward), after);
    expect(view.checks.find((check) => check.id === 'ears')?.pass).toBe(false);
    expect(view.tip).toBe('Glide your chin back a little');
  });

  it('fails relaxed shoulders when they shrug', () => {
    const frame = pose();
    const after = afterFrom(frame);
    const shrugged = pose({
      leftShoulder: { x: 220, y: 300, visibility: 1 },
      rightShoulder: { x: 420, y: 300, visibility: 1 },
    });
    const view = lockView(measureLockPose(shrugged), after);
    expect(view.checks.find((check) => check.id === 'shoulders')?.pass).toBe(false);
  });

  it('fails eye level when looking down', () => {
    const frame = pose({ pitchDeg: 25 });
    const view = lockView(measureLockPose(frame), afterFrom(pose()));
    expect(view.checks.find((check) => check.id === 'level')?.pass).toBe(false);
    expect(view.tip).toContain('Look straight ahead');
  });

  it('pauses the fill without resetting it', () => {
    expect(advanceLockFill(0.4, 1_000, false)).toBe(0.4);
    expect(advanceLockFill(0.4, 1_000, true)).toBeGreaterThan(0.4);
  });

  it('never saves a print from fewer than 45 good frames', () => {
    expect(lockMaySave(44)).toBe(false);
    expect(lockMaySave(45)).toBe(true);
  });

  it('moves the match off zero as soon as a person is measured', () => {
    const measured = measureLockPose(pose());
    expect(movingMatch(null, 0, false)).toBeNull();
    expect(movingMatch(measured, 0, false)).toBeGreaterThan(0);
    expect(movingMatch(measured, 4, true)).toBe(100);
  });
});
