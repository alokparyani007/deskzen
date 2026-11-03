import { describe, expect, it } from 'vitest';
import type { Landmark, Landmarks } from '../../lib/posture/types';
import {
  activeTip,
  baselineFromMeasures,
  chipPassing,
  EMPTY_HISTORY,
  measurePose,
  snapshotRules,
  tipFor,
  type RuleHistory,
} from './poseRules';

function point(x: number, y: number, visibility = 0.99): Landmark {
  return { x, y, visibility };
}

function upright(overrides: Partial<Landmarks> = {}): Landmarks {
  return {
    timestampMs: 1,
    videoWidth: 1000,
    videoHeight: 600,
    faceCount: 1,
    faceAmbiguous: false,
    nose: point(500, 200),
    leftEye: point(460, 210),
    rightEye: point(540, 210),
    leftShoulder: point(300, 420),
    rightShoulder: point(700, 420),
    leftElbow: point(280, 520),
    rightElbow: point(720, 520),
    faceBox: { x: 0.42, y: 0.2, w: 0.16, h: 0.22 },
    pitchDeg: 0,
    yawDeg: 0,
    leftIrisDiameterPx: 16.6,
    rightIrisDiameterPx: 16.6,
    ...overrides,
  };
}

const history: RuleHistory = { ...EMPTY_HISTORY, maxNeckRatio: 0.55 };

describe('snapshot rules', () => {
  it('passes a centered upright pose', () => {
    const rules = snapshotRules(measurePose(upright()), 'sit', history);
    const chips = ['R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12'];
    for (const id of chips) expect(rules.find((rule) => rule.id === id)?.pass, id).toBe(true);
    expect(chipPassing(rules, 'head')).toBe(true);
    expect(chipPassing(rules, 'shoulders')).toBe(true);
    expect(chipPassing(rules, 'tall')).toBe(true);
    expect(chipPassing(rules, 'distance')).toBe(true);
  });

  it('fails shoulder tilt of 6 degrees', () => {
    const rise = 400 * Math.tan((6 * Math.PI) / 180);
    const rules = snapshotRules(measurePose(upright({ rightShoulder: point(700, 420 + rise) })), 'sit', history);
    expect(rules.find((rule) => rule.id === 'R8')?.pass).toBe(false);
  });

  it('asks the mirrored preview to move left when the nose is at 0.2 of the width', () => {
    const frame = upright({
      nose: point(200, 200),
      leftEye: point(160, 210),
      rightEye: point(240, 210),
    });
    const rules = snapshotRules(measurePose(frame), 'sit', history);
    const center = rules.find((rule) => rule.id === 'R2');
    expect(center?.pass).toBe(false);
    expect(tipFor(center!, true, 'sit').title).toBe('Move a little left');
    expect(activeTip(rules, 'head', true, 'sit')?.title).toBe('Move a little left');
  });

  it('fails when the right shoulder is missing', () => {
    const rules = snapshotRules(measurePose(upright({ rightShoulder: undefined })), 'sit', history);
    expect(rules.find((rule) => rule.id === 'R7')?.pass).toBe(false);
  });

  it('calls a face that fills a quarter of the frame too close', () => {
    const rules = snapshotRules(
      measurePose(upright({ faceBox: { x: 0.3, y: 0.2, w: 0.25, h: 0.3 }, leftIrisDiameterPx: undefined, rightIrisDiameterPx: undefined })),
      'sit',
      history,
    );
    const distance = rules.find((rule) => rule.id === 'R12b');
    expect(distance?.pass).toBe(false);
    expect(distance?.issue).toBe('close');
    expect(tipFor(distance!, true).title).toBe('Move back a little');
  });

  it('uses the standing band for nose offset', () => {
    const frame = upright({ nose: point(552, 200) });
    const measures = measurePose(frame);
    expect(snapshotRules(measures, 'sit', history).find((rule) => rule.id === 'R9')?.pass).toBe(false);
    expect(snapshotRules(measures, 'stand', history).find((rule) => rule.id === 'R9')?.pass).toBe(true);
  });

  it('never returns NaN', () => {
    const rules = snapshotRules(
      measurePose(upright({ leftShoulder: point(500, 420), rightShoulder: point(500, 420), leftIrisDiameterPx: undefined, rightIrisDiameterPx: undefined })),
      'sit',
      history,
    );
    for (const rule of rules) {
      expect(rule.value === null || Number.isFinite(rule.value)).toBe(true);
      expect(Number.isFinite(rule.deviation)).toBe(true);
    }
    expect(baselineFromMeasures(measurePose(upright()))).not.toBeNull();
  });
  it('asks the user to sit back when the shoulder caps run off the frame', () => {
    const fits = snapshotRules(measurePose(upright()), 'sit', history).find((rule) => rule.id === 'R12c');
    expect(fits?.pass).toBe(true);
    const wide = snapshotRules(measurePose(upright({ leftShoulder: point(120, 420), rightShoulder: point(880, 420) })), 'sit', history);
    const cut = wide.find((rule) => rule.id === 'R12c');
    expect(cut?.pass).toBe(false);
    expect(chipPassing(wide, 'distance')).toBe(false);
    expect(tipFor(cut!, true, 'sit').title).toBe('Sit back a little');
  });
});
