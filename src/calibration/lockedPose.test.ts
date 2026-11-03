import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../lib/posture/types';
import { driftKind, fitLockedPose, liveFromPrint, lockedPoseFromFrames, outlinePath, pathNear } from './lockedPose';

function frame(noseX: number, extra?: Partial<Landmarks>): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: noseX, y: 180 },
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
    faceBox: { x: 0.4, y: 0.2, w: 0.16, h: 0.2 },
    ...extra,
  };
}

describe('locked pose', () => {
  it('uses the median of the lock frames', () => {
    const pose = lockedPoseFromFrames([frame(200), frame(320), frame(500)]);
    expect(pose).not.toBeNull();
    expect(pose!.nose.x).toBeCloseTo(1 - 320 / 640, 4);
  });

  it('keeps the outline path within 2% of the saved shoulders', () => {
    const pose = lockedPoseFromFrames([frame(320)])!;
    const path = outlinePath(pose);
    expect(pathNear(path, pose.leftShoulder)).toBe(true);
    expect(pathNear(path, pose.rightShoulder)).toBe(true);
  });

  it('scales around the shoulders when the face width changes', () => {
    const pose = lockedPoseFromFrames([frame(320)])!;
    const fitted = fitLockedPose(pose, pose.faceWidth * 1.4);
    expect(fitted.moved).toBe(true);
    const mid = (pose.leftShoulder.x + pose.rightShoulder.x) / 2;
    expect(fitted.pose.leftShoulder.x).toBeCloseTo(mid + (pose.leftShoulder.x - mid) * 1.4, 4);
    expect(fitLockedPose(pose, pose.faceWidth * 1.1).moved).toBe(false);
  });

  it('uses the print score when a print amount is present', () => {
    const live = liveFromPrint(2);
    expect(live.drifting).toBe(true);
    expect(live.label).toBe('Drifting');
    expect(liveFromPrint(0.2).label).toBe('Great posture');
    expect(driftKind({ head: 2, shoulders: 0.2, lean: 0.1 })).toBe('head');
  });

  it('has no broken encoding in src', () => {
    const root = join(process.cwd(), 'src');
    const files = walk(root).filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'));
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      expect(text.includes('\uFFFD'), file).toBe(false);
    }
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
