import { describe, expect, it } from 'vitest';
import { lockedPoseFromFrames } from '../../calibration/lockedPose';
import type { Landmarks } from '../../lib/posture/types';
import { anchorOutline, headGap, landmarkOutlinePoints, placeOnShoulders, showGuideArrow, smoothAnchor, smoothPoints, toScreen } from './outline';

function frame(): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 320, y: 180 },
    leftEye: { x: 300, y: 160 },
    rightEye: { x: 340, y: 160 },
    leftEar: { x: 280, y: 175 },
    rightEar: { x: 360, y: 175 },
    leftShoulder: { x: 220, y: 340 },
    rightShoulder: { x: 420, y: 340 },
    chin: { x: 320, y: 210 },
    headTop: { x: 320, y: 120 },
    leftFace: { x: 290, y: 170 },
    rightFace: { x: 350, y: 170 },
  };
}

describe('live outline', () => {
  it('mirrors a camera pixel into the object-cover view', () => {
    expect(toScreen(0, 0, 640, 360, 640, 360)).toEqual({ x: 640, y: 0 });
    expect(toScreen(640, 180, 640, 360, 640, 360)).toEqual({ x: 0, y: 180 });
    const cropped = toScreen(320, 240, 640, 480, 1600, 900);
    expect(cropped.x).toBeCloseTo(800);
    expect(cropped.y).toBeCloseTo(450);
  });

  it('eases the outline a fifth of the way toward the next shape', () => {
    const next = smoothPoints([{ x: 0, y: 0 }], [{ x: 10, y: 0 }]);
    expect(next[0]?.x).toBeCloseTo(2);
    expect(next[0]?.y).toBeCloseTo(0);
  });

  it('hides the arrow at 80% or when the head is within 4%', () => {
    expect(showGuideArrow(79, 0.05)).toBe(true);
    expect(showGuideArrow(79, 0.04)).toBe(false);
    expect(showGuideArrow(80, 0.2)).toBe(false);
    expect(headGap({ x: 0, y: 0 }, { x: 10, y: 0 }, 100, 100)).toBeCloseTo(0.1);
  });

  it('builds a shoulder-wide body outline and seats it on the live shoulders', () => {
    const pose = lockedPoseFromFrames([frame()])!;
    const points = landmarkOutlinePoints(pose);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const headWidth = Math.abs((pose.leftEar?.x ?? pose.leftEye.x) - (pose.rightEar?.x ?? pose.rightEye.x));
    expect(width).toBeGreaterThan(headWidth * 1.4);
    expect(Math.min(...ys)).toBeLessThan(pose.nose.y);
    expect(Math.max(...ys)).toBeGreaterThan(pose.leftShoulder.y);
    const placed = placeOnShoulders(points, pose, frame())!;
    const left = placed.reduce((best, point) => (point.x < best.x ? point : best));
    const right = placed.reduce((best, point) => (point.x > best.x ? point : best));
    expect(left.x).toBeLessThan(320);
    expect(right.x).toBeGreaterThan(320);
  });

  it('scales the saved outline onto the live shoulder line', () => {
    const points = [
      { x: 100, y: 200 },
      { x: 140, y: 200 },
      { x: 120, y: 120 },
    ];
    const placed = anchorOutline(points, { x: 120, y: 200 }, 40, 300, 400, 80);
    expect(placed[0]).toEqual({ x: 260, y: 400 });
    expect(placed[1]).toEqual({ x: 340, y: 400 });
    expect(placed[2]).toEqual({ x: 300, y: 240 });
    const eased = smoothAnchor({ scale: 1, x: 0, y: 0 }, { scale: 2, x: 10, y: 20 });
    expect(eased.scale).toBeCloseTo(1.2);
    expect(eased.x).toBeCloseTo(2);
    expect(eased.y).toBeCloseTo(4);
  });
});
