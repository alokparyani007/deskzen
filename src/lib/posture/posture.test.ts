import { describe, expect, it } from 'vitest';
import { assessAlignment } from './alignment';
import { computeBaseline, isGoodCalibrationFrame, median } from './baseline';
import { postureConfig } from './config';
import {
  distanceInches,
  focalPxFromWidth,
  frameSignals,
  refineFocalLength,
  tiltFromHorizontalDeg,
} from './signals';
import type { Baseline, Landmark, Landmarks } from './types';

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
  const shoulderHalf = ((focal * postureConfig.guideShoulderMm) / distanceMm) / 2;
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

describe('signal helpers', () => {
  it('treats a level pair as about 0 degrees even if right is left of left', () => {
    expect(Math.abs(tiltFromHorizontalDeg({ x: 100, y: 40 }, { x: 20, y: 40 }))).toBeLessThan(0.01);
    expect(tiltFromHorizontalDeg({ x: 0, y: 0 }, { x: 100, y: 10 })).toBeGreaterThan(5);
  });

  it('estimates arm-length distance from iris size', () => {
    const sample = poseAt();
    const signals = frameSignals(sample);
    expect(signals.screenDistanceIn).toBeGreaterThan(24);
    expect(signals.screenDistanceIn).toBeLessThan(26);
    expect(signals.ipdPx).toBeGreaterThan(0);
    expect(Math.abs(signals.eyeAngleDeg ?? 99)).toBeLessThan(1);
    expect(Math.abs(signals.shoulderAngleDeg ?? 99)).toBeLessThan(1);
  });

  it('scales focal length when the user reports a distance', () => {
    const sample = poseAt();
    const result = computeBaseline(Array.from({ length: 12 }, () => poseAt()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const refined = refineFocalLength(result.baseline, 30);
    expect(refined.screenDistanceIn).toBe(30);
    expect(refined.focalPx).toBeGreaterThan(result.baseline.focalPx);
    const inches = distanceInches(sample.leftIrisDiameterPx!, refined.focalPx);
    expect(inches).toBeGreaterThan(29);
    expect(inches).toBeLessThan(31);
  });
});

describe('alignment', () => {
  it('turns every guide on for a centered arm-length pose', () => {
    const alignment = assessAlignment(poseAt());
    expect(alignment.allGreen).toBe(true);
    expect(alignment.coaching).toBeNull();
    expect(alignment.guides.every((guide) => guide.aligned)).toBe(true);
  });

  it('asks you to sit back when you are too close', () => {
    const alignment = assessAlignment(
      poseAt({ leftIrisDiameterPx: 40, rightIrisDiameterPx: 40 }),
    );
    expect(alignment.allGreen).toBe(false);
    expect(alignment.coaching).toBe('Sit back a little.');
    expect(alignment.guides.find((guide) => guide.id === 'distance')?.aligned).toBe(false);
  });

  it('asks you to level your head when your eyes tilt', () => {
    const sample = poseAt();
    const alignment = assessAlignment(
      poseAt({
        leftEye: point(sample.leftEye!.x, sample.leftEye!.y - 30),
        leftIrisCenter: point(sample.leftEye!.x, sample.leftEye!.y - 30),
      }),
    );
    expect(alignment.coaching).toBe('Level your head.');
    expect(alignment.guides.find((guide) => guide.id === 'eyes')?.aligned).toBe(false);
  });

  it('asks you to raise the screen when your eyes sit below the line', () => {
    const sample = poseAt();
    const dropped = sample.leftEye!.y + 80;
    const alignment = assessAlignment(
      poseAt({
        leftEye: point(sample.leftEye!.x, dropped),
        rightEye: point(sample.rightEye!.x, dropped),
        leftIrisCenter: point(sample.leftEye!.x, dropped),
        rightIrisCenter: point(sample.rightEye!.x, dropped),
        nose: point(sample.nose!.x, dropped + 20),
      }),
    );
    expect(alignment.coaching).toBe('Raise your screen or sit taller.');
  });

  it('asks you to drop your shoulders when they rise above the line', () => {
    const sample = poseAt();
    const raised = sample.leftShoulder!.y - 80;
    const alignment = assessAlignment(
      poseAt({
        leftShoulder: point(sample.leftShoulder!.x, raised),
        rightShoulder: point(sample.rightShoulder!.x, raised),
      }),
    );
    expect(alignment.coaching).toBe('Drop your shoulders.');
    expect(alignment.guides.find((guide) => guide.id === 'shoulders')?.aligned).toBe(false);
  });
});

describe('computeBaseline', () => {
  it('saves medians from a steady hold', () => {
    const samples = Array.from({ length: 20 }, (_, index) =>
      poseAt({
        timestampMs: index * 50,
        nose: point(width / 2 + (index % 2), height * 0.42),
      }),
    );
    const result = computeBaseline(samples);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.baseline.version).toBe(1);
    expect(result.baseline.ipdPx).toBeGreaterThan(0);
    expect(result.baseline.nose.x).toBeCloseTo(0.5, 1);
    expect(result.baseline.screenDistanceIn).toBeGreaterThan(24);
    expect(result.baseline.screenDistanceIn).toBeLessThan(26);
    expect(JSON.stringify(result.baseline)).not.toMatch(/data:image|blob:|landmarkImage/i);
  });

  it('rejects a hold where you moved', () => {
    const samples = Array.from({ length: 15 }, (_, index) =>
      poseAt({
        timestampMs: index * 50,
        nose: point(width / 2 + index * 12, height * 0.42),
      }),
    );
    const result = computeBaseline(samples);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('moved');
  });

  it('rejects when shoulders are missing on too many frames', () => {
    const samples = Array.from({ length: 15 }, (_, index) =>
      poseAt({
        timestampMs: index * 50,
        leftShoulder: index < 3 ? poseAt().leftShoulder : undefined,
        rightShoulder: index < 3 ? poseAt().rightShoulder : undefined,
      }),
    );
    expect(samples.filter(isGoodCalibrationFrame).length).toBeLessThan(15 * 0.7);
    const result = computeBaseline(samples);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('cant-see-shoulders');
  });

  it('rejects a dark, low-visibility hold', () => {
    const samples = Array.from({ length: 12 }, (_, index) =>
      poseAt({
        timestampMs: index * 50,
        nose: point(width / 2, height * 0.42, 0.2),
        leftEye: point(200, 180, 0.2),
        rightEye: point(440, 180, 0.2),
      }),
    );
    const result = computeBaseline(samples);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('too-dark');
  });

  it('finds a median', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });
});

describe('baseline shape', () => {
  it('keeps only numbers', () => {
    const result = computeBaseline(Array.from({ length: 12 }, () => poseAt()));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const baseline: Baseline = result.baseline;
    expect(typeof baseline.createdAt).toBe('string');
    expect(typeof baseline.ipdPx).toBe('number');
    expect(baseline.leftShoulder.x).toBeGreaterThan(0);
    expect(baseline.leftShoulder.x).toBeLessThan(1);
  });
});
