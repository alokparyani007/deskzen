import { describe, expect, it } from 'vitest';
import { initialGreat, noteAlertDismiss, stepGreatMoment, tooStrict } from './adaptiveGlow';
import { headOffset, initialRing, orbInside, smoothOrb, stepRing } from './bubble';
import { blendBaseline } from './glowUp';
import { matchProfile, stepProfilePick, type DeskProfile } from './profiles';
import { setupViewChanged } from './glow';
import type { Baseline } from './types';

function baseline(ipdPx: number, noseX = 0.5): Baseline {
  return {
    version: 1,
    createdAt: '2026-10-25T12:00:00.000Z',
    ipdPx,
    headDropNorm: 1,
    shrugNorm: 1,
    roundNorm: 1,
    shoulderAngleDeg: 0,
    eyeAngleDeg: 0,
    shoulderWidthPx: 160,
    focalPx: 500,
    screenDistanceIn: 24,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: noseX, y: 0.4 },
    leftEye: { x: 0.45, y: 0.36 },
    rightEye: { x: 0.55, y: 0.36 },
    leftShoulder: { x: 0.35, y: 0.6 },
    rightShoulder: { x: 0.65, y: 0.6 },
  };
}

function desk(id: DeskProfile['id'], ipdPx: number, noseX: number, noseY: number): DeskProfile {
  return {
    id,
    name: id,
    sit: baseline(ipdPx, noseX),
    stand: null,
    view: { ipdPx, noseX, noseY },
  };
}

describe('orb smoothing', () => {
  it('eases toward the head instead of jumping', () => {
    const next = { x: 1, y: 0 };
    const stepped = smoothOrb({ x: 0, y: 0 }, next, 0.35, 0.35);
    expect(stepped.x).toBeGreaterThan(0.5);
    expect(stepped.x).toBeLessThan(1);
    expect(smoothOrb({ x: 0.2, y: 0 }, next, 0, 0.35).x).toBe(0.2);
  });

  it('centers the orb when the nose is over the shoulders at the target height', () => {
    const offset = headOffset({ x: 100, y: 28 }, { x: 60, y: 100 }, { x: 140, y: 100 }, 0.9);
    expect(offset).not.toBeNull();
    expect(offset!.x).toBeCloseTo(0, 5);
    expect(orbInside(offset!, 0.12)).toBe(true);
  });
});

describe('ring fill', () => {
  it('fills over 3 seconds and pauses without resetting when the orb leaves', () => {
    let state = initialRing();
    state = stepRing(state, true, 1000, 3000);
    expect(state.filledMs).toBe(1000);
    expect(state.done).toBe(false);
    state = stepRing(state, false, 4000, 3000);
    expect(state.paused).toBe(true);
    expect(state.filledMs).toBe(1000);
    state = stepRing(state, true, 2000, 3000);
    expect(state.done).toBe(true);
    expect(state.filledMs).toBe(3000);
  });
});

describe('adaptive blend', () => {
  it('keeps 70% of the old Glow and 30% of the new one', () => {
    const saved = blendBaseline(baseline(100), { ...baseline(200), nose: { x: 1, y: 0.4 } }, 0.7);
    expect(saved.ipdPx).toBeCloseTo(130);
    expect(saved.nose.x).toBeCloseTo(0.65);
  });

  it('asks only after the top band stays steady for 20 seconds', () => {
    let state = initialGreat();
    for (let second = 0; second < 19; second += 1) {
      const stepped = stepGreatMoment(state, { nowMs: second * 1000, score: 95, good: true, top: 90, needMs: 20_000 });
      state = stepped.state;
      expect(stepped.ready).toBe(false);
    }
    const ready = stepGreatMoment(state, { nowMs: 20_000, score: 95, good: true, top: 90, needMs: 20_000 });
    expect(ready.ready).toBe(true);
    const leaned = stepGreatMoment(ready.state, { nowMs: 21_000, score: 70, good: true, top: 90, needMs: 20_000 });
    expect(leaned.state.steadyMs).toBe(0);
    expect(leaned.ready).toBe(false);
  });
});

describe('too-strict trigger', () => {
  it('offers a tune after 3 alert dismissals inside an hour', () => {
    const hour = 60 * 60 * 1000;
    let times: number[] = [];
    times = noteAlertDismiss(times, 1_000, hour);
    times = noteAlertDismiss(times, 2_000, hour);
    expect(tooStrict(times, 3)).toBe(false);
    times = noteAlertDismiss(times, 3_000, hour);
    expect(tooStrict(times, 3)).toBe(true);
    const later = noteAlertDismiss(times, 3_000 + hour + 1, hour);
    expect(later).toEqual([3_000 + hour + 1]);
    expect(tooStrict(later, 3)).toBe(false);
  });
});

describe('profile matching', () => {
  const profiles = [desk('home', 100, 0.5, 0.4), desk('office', 150, 0.3, 0.3), desk('kitchen', 80, 0.7, 0.55)];

  it('picks the desk with the closest face scale and position', () => {
    expect(matchProfile(profiles, { ipdPx: 104, noseX: 0.52, noseY: 0.41 })).toBe('home');
    expect(matchProfile(profiles, { ipdPx: 210, noseX: 0.1, noseY: 0.1 })).toBeNull();
  });

  it('waits before switching so a passing match does not flip desks', () => {
    const first = stepProfilePick({ id: null, sinceMs: 0 }, 'office', 1000, 'home', 2000);
    expect(first.switchTo).toBeNull();
    const held = stepProfilePick(first.state, 'office', 3000, 'home', 2000);
    expect(held.switchTo).toBe('office');
  });
});

describe('setup view', () => {
  it('notices a camera tilt when the face size stays put', () => {
    const saved = baseline(100);
    expect(setupViewChanged(saved, { ipdPx: 100, shoulderAngleDeg: 12, noseY: 0.4 })).toBe(true);
    expect(setupViewChanged(saved, { ipdPx: 100, shoulderAngleDeg: 2, noseY: 0.4 })).toBe(false);
    expect(setupViewChanged(saved, { ipdPx: 120, shoulderAngleDeg: 0, noseY: 0.4 })).toBe(true);
  });
});
