import { describe, expect, it } from 'vitest';
import { printStepLabel } from '../features/print/printSteps';
import { markSkipped, previousMove } from '../features/print/resetFlow';
import {
  breathFinished,
  chinTuckSeen,
  neckStretchSeen,
  scoreLooseness,
  shoulderRollDetected,
  type MoveSample,
  type RestSnapshot,
} from './bodyReset';

function sequence(points: Array<[number, number, number, number]>, width = 100, rollDeg = 0): MoveSample[] {
  return points.map(([tMs, shoulderMidY, faceWidth, noseY]) => ({
    tMs,
    shoulderMidY,
    shoulderWidth: width,
    faceWidth,
    noseY,
    rollDeg,
  }));
}

function still(untilMs: number): MoveSample[] {
  const frames: MoveSample[] = [];
  for (let tMs = 0; tMs <= untilMs; tMs += 100) frames.push(sequence([[tMs, 200, 40, 120]])[0]!);
  return frames;
}

function rolls(times: number): MoveSample[] {
  const frames: MoveSample[] = [];
  for (let roll = 0; roll < times; roll += 1) {
    const origin = roll * 1_200;
    for (let step = 0; step <= 1_000; step += 100) {
      const raised = step >= 200 && step <= 600;
      frames.push(sequence([[origin + step, raised ? 188 : 200, 40, 120]])[0]!);
    }
  }
  return frames;
}

function sit(gap: number, tilt = 0, face = 0.4, jitter = 0): RestSnapshot {
  return { shoulderGap: gap, tiltDeg: tilt, faceRatio: face, jitter, shoulderWidthPx: 200, irisPx: 20 };
}

describe('body reset detectors', () => {
  it('does not mark a move done when nobody moves', () => {
    const frames = still(2_000);
    expect(shoulderRollDetected(frames)).toBe(false);
    expect(chinTuckSeen(frames)).toBe(false);
    expect(neckStretchSeen(frames).done).toBe(false);
  });

  it('sees two shoulder rolls and ignores a single one', () => {
    expect(shoulderRollDetected(rolls(2))).toBe(true);
    expect(shoulderRollDetected(rolls(1))).toBe(false);
    expect(shoulderRollDetected(still(2_000))).toBe(false);
  });

  it('ignores a tiny shoulder wobble', () => {
    const frames: MoveSample[] = [];
    for (let tMs = 0; tMs <= 2_000; tMs += 100) {
      frames.push(sequence([[tMs, tMs % 400 < 200 ? 200 : 196, 40, 120]])[0]!);
    }
    expect(shoulderRollDetected(frames)).toBe(false);
  });

  it('sees a chin tuck and ignores a nod', () => {
    const tuck: MoveSample[] = [];
    const nod: MoveSample[] = [];
    for (let tMs = 0; tMs <= 2_000; tMs += 100) {
      const moved = tMs >= 200;
      tuck.push(sequence([[tMs, 200, moved ? 36 : 40, 120]])[0]!);
      nod.push(sequence([[tMs, 200, moved ? 36 : 40, moved ? 126 : 120]])[0]!);
    }
    expect(chinTuckSeen(tuck)).toBe(true);
    expect(chinTuckSeen(nod)).toBe(false);
  });

  it('detects a neck stretch to both sides', () => {
    const frames = [sequence([[0, 200, 40, 120]], 100, -14)[0]!, sequence([[100, 200, 40, 120]], 100, 13)[0]!];
    expect(neckStretchSeen(frames)).toEqual({ left: true, right: true, done: true });
    expect(neckStretchSeen([frames[0]!]).done).toBe(false);
  });

  it('finishes the breath after the ten-second guide', () => {
    expect(breathFinished(9_900)).toBe(false);
    expect(breathFinished(10_000)).toBe(true);
  });
});

describe('looseness', () => {
  it('scores 80 or more when the shoulder gap grows 7 percent and the sit is level and still', () => {
    const score = scoreLooseness(sit(1), sit(1.07, 2, 0.4, 0.01));
    expect(score.score).toBeGreaterThanOrEqual(80);
    expect(score.reason).toBeNull();
  });

  it('stays under 80 and names raised shoulders when the gap shrinks', () => {
    const score = scoreLooseness(sit(1), sit(0.9, 1, 0.4, 0.01));
    expect(score.score).toBeLessThan(80);
    expect(score.message?.toLowerCase()).toContain('shoulders');
    expect(score.message?.toLowerCase()).toContain('up');
  });
});

describe('body reset navigation', () => {
  it('labels body reset as step 2 of 5', () => {
    expect(printStepLabel('Body reset')).toBe('Step 2 of 5');
  });

  it('goes back one move and marks a skip', () => {
    expect(previousMove(1)).toBe(0);
    expect(previousMove(0)).toBe(0);
    expect(markSkipped([null, null, null, null], 1)[1]).toBe('skipped');
  });
});
