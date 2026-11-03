import { describe, expect, it } from 'vitest';
import { aggregateFeature, capturePhase, mad, trimmedMean } from './aggregate';
import { calibrationConfig } from './config';
import { confidenceDecision, confidenceScore } from './confidence';
import { extractFeatures } from './features';
import { posturePrintV2Enabled } from './flag';
import { isVerifiedGood, learnValues, nextCurrent } from './learn';
import { migrateBaseline, migrateBaselines, findLivePrint, PRINTS_RECORD_KEY, type PosturePrint } from './print';
import { frameQuality } from './quality';
import { thresholdFromSlouch } from './thresholds';
import { median } from '../lib/posture/baseline';
import type { Baseline, Landmark, Landmarks } from '../lib/posture/types';

function point(x: number, y: number, visibility = 1): Landmark {
  return { x, y, visibility };
}

function pose(): Landmarks {
  return {
    timestampMs: 0,
    videoWidth: 200,
    videoHeight: 200,
    faceCount: 1,
    nose: point(100, 70),
    leftEye: point(90, 40),
    rightEye: point(110, 40),
    leftEar: point(70, 50),
    rightEar: point(130, 50),
    leftShoulder: point(50, 100),
    rightShoulder: point(150, 100),
    leftHip: point(60, 160),
    rightHip: point(140, 160),
    leftElbow: point(40, 130),
    rightElbow: point(160, 130),
    leftWrist: point(70, 150),
    rightWrist: point(130, 150),
    leftIrisDiameterPx: 12,
    rightIrisDiameterPx: 12,
  };
}

function baseline(): Baseline {
  return {
    version: 1,
    createdAt: '2026-10-01T12:00:00.000Z',
    ipdPx: 40,
    headDropNorm: 0.8,
    shrugNorm: 0.4,
    roundNorm: 2,
    shoulderAngleDeg: 1,
    eyeAngleDeg: 0,
    shoulderWidthPx: 100,
    focalPx: 500,
    screenDistanceIn: 24,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 0.5, y: 0.4 },
    leftEye: { x: 0.45, y: 0.35 },
    rightEye: { x: 0.55, y: 0.35 },
    leftShoulder: { x: 0.3, y: 0.6 },
    rightShoulder: { x: 0.7, y: 0.6 },
    pose: 'sit',
  };
}

describe('posture print flag', () => {
  it('stays on in dev unless turned off, and off in production until turned on', () => {
    expect(posturePrintV2Enabled({ dev: true, stored: null })).toBe(true);
    expect(posturePrintV2Enabled({ dev: true, stored: '0' })).toBe(false);
    expect(posturePrintV2Enabled({ dev: false, stored: null })).toBe(false);
    expect(posturePrintV2Enabled({ dev: false, stored: '1' })).toBe(true);
  });
});

describe('feature extraction', () => {
  it('splits body-shape ratios from frame position', () => {
    const { internal, external } = extractFeatures({ landmarks: pose() });
    expect(internal.headDrop).toBeCloseTo(0.6, 5);
    expect(internal.leanIn).toBeCloseTo(0.2, 5);
    expect(internal.rounding).toBeCloseTo(5, 5);
    expect(internal.hipLean).toBeCloseTo(0, 5);
    expect(internal.forwardHead).toBeGreaterThan(0);
    expect(external.faceScale).toBe(12);
    expect(external.shoulderWidthPx).toBeCloseTo(100, 5);
    expect(external.headX).toBeCloseTo(0.5, 5);
  });

  it('uses the face-matrix roll when the caller has it', () => {
    const { internal } = extractFeatures({ landmarks: pose(), rollDeg: 4 });
    expect(internal.headRoll).toBe(4);
  });
});

describe('quality gates', () => {
  it('accepts a clear single person and rejects the spec failures', () => {
    const landmarks = pose();
    expect(frameQuality({ landmarks })).toBeNull();
    expect(frameQuality({ landmarks, posePresence: 0.2 })).toBe('presence');
    expect(frameQuality({ landmarks: { ...landmarks, leftShoulder: point(50, 100, 0.4) } })).toBe('shoulders');
    expect(frameQuality({ landmarks: { ...landmarks, faceCount: 2 } })).toBe('faces');
    expect(frameQuality({ landmarks, yawDeg: 20 })).toBe('yaw');
    expect(frameQuality({ landmarks, yawDeg: 20, printYawDeg: 18 })).toBeNull();
    expect(frameQuality({ landmarks, rollDeg: 12 })).toBe('roll');
    expect(frameQuality({ landmarks, prevNose: { x: 0, y: 70 } })).toBe('motion');
    expect(frameQuality({ landmarks, luminance: 0.01 })).toBe('light');
  });
});

describe('aggregation', () => {
  it('uses a 20% trimmed mean and scaled MAD once there are 30 frames', () => {
    const values = [...Array(10).fill(0), ...Array(10).fill(10), ...Array(10).fill(100)];
    expect(trimmedMean(values)).toBeCloseTo((4 * 0 + 10 * 10 + 4 * 100) / 18, 5);
    expect(aggregateFeature(values)?.value).toBeCloseTo(trimmedMean(values), 5);
    expect(mad([1, 2, 3, 4, 5])).toBeCloseTo(1.4826, 4);
  });

  it('falls back to the existing median below 30 frames', () => {
    const values = [1, 1, 1, 10, 10];
    expect(aggregateFeature(values)?.value).toBe(median(values));
    expect(aggregateFeature(values)?.value).not.toBeCloseTo(trimmedMean(values), 5);
  });

  it('waits 5 seconds, extends when frames are short, then fails once', () => {
    expect(capturePhase(10, 1000)).toBe('capturing');
    expect(capturePhase(50, 5000)).toBe('ready');
    expect(capturePhase(10, 5000)).toBe('extend');
    expect(capturePhase(10, 10_000)).toBe('fail');
  });
});

describe('thresholds and confidence', () => {
  it('clamps the slouch step between the deadband and the default threshold', () => {
    const wide = thresholdFromSlouch('headDrop', 1, 3, 0.01);
    expect(wide.slouchDelta).toBe(2);
    expect(wide.threshold).toBeCloseTo(1 + calibrationConfig.defaultThreshold.headDrop, 5);
    expect(wide.weight).toBe(1);
    const weak = thresholdFromSlouch('headDrop', 1, 1.2, 0.2);
    expect(weak.weight).toBe(calibrationConfig.weakWeight);
    expect(weak.threshold).toBeGreaterThan(1);
  });

  it('scores confidence from the five parts and picks save, tip, or retry', () => {
    expect(confidenceScore({ goodFrameRatio: 1, stillness: 1, meanVisibility: 1, lighting: 1, framing: 1 })).toBe(100);
    expect(confidenceDecision(75)).toBe('save');
    expect(confidenceDecision(74)).toBe('save-with-tip');
    expect(confidenceDecision(55)).toBe('save-with-tip');
    expect(confidenceDecision(54)).toBe('retry');
  });
});

describe('adaptive guardrails', () => {
  it('never learns a slouch, even after many steps toward one', () => {
    let current = 1;
    for (let step = 0; step < 200; step += 1) current = nextCurrent(current, 1, 2, 1);
    expect(current).toBeLessThanOrEqual(1 + calibrationConfig.maxTowardSlouchRatio + 1e-9);
    expect(current).toBeGreaterThan(1);
    expect(nextCurrent(1, 1, 0, 0)).toBe(1);
  });

  it('ignores a moment that is not verified', () => {
    const learned = learnValues({ headDrop: 1 }, { headDrop: 1 }, { headDrop: 2 }, { headDrop: 1 }, {
      kind: 'steady',
      holdMs: 1000,
      confidence: 90,
      inTopBand: true,
    });
    expect(learned.tuned).toBe(false);
    expect(learned.values.headDrop).toBe(1);
    expect(isVerifiedGood({ kind: 'button', holdMs: 3000 })).toBe(true);
    expect(isVerifiedGood({ kind: 'corrected', holdMs: 10_000 })).toBe(true);
  });
});

describe('storage migration', () => {
  it('keeps the old baseline keys and stores a low-confidence print per mode', () => {
    expect(PRINTS_RECORD_KEY).not.toBe('baseline');
    expect(PRINTS_RECORD_KEY).not.toBe('baseline-stand');
    const source = baseline();
    const sit = migrateBaseline(source, 'sit', 'home');
    expect(source.version).toBe(1);
    expect(sit.version).toBe(2);
    expect(sit.mode).toBe('sit');
    expect(sit.deskProfileId).toBe('home');
    expect(sit.confidence).toBe(calibrationConfig.migratedConfidence);
    expect(sit.confidence).toBeLessThan(calibrationConfig.confidence.tipAt);
    expect(sit.anchor.values.headDrop).toBe(0.8);
    expect(sit.anchor.values.leanIn).toBeCloseTo(0.5, 5);
    expect(sit.external.faceScale).toBe(40);
    const first = migrateBaselines({ version: 2, prints: [] }, { deskProfileId: 'office', sit: source, stand: { ...source, pose: 'stand' } });
    expect(first.migrated).toBe(true);
    expect(first.library.prints.map((print) => print.mode)).toEqual(['sit', 'stand']);
    const second = migrateBaselines(first.library, { deskProfileId: 'office', sit: source, stand: source });
    expect(second.migrated).toBe(false);
    expect(second.library.prints).toHaveLength(2);
  });
});

describe('live print lookup', () => {
  it('falls back to the saved print when Auto is looking at the other mode', () => {
    const sit = { mode: 'sit', deskProfileId: 'home' } as PosturePrint;
    const library = { version: 2 as const, prints: [sit] };
    expect(findLivePrint(library, 'stand', 'home', true)).toBe(sit);
    expect(findLivePrint(library, 'stand', 'home', false)).toBeUndefined();
    expect(findLivePrint(library, 'sit', 'home', false)).toBe(sit);
  });
});
