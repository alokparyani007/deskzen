import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../lib/posture/types';
import { canSpeak, outlineFit, setupCheck, setupContinue, shoulderRollSeen, toGuideSpace, type LightSample } from './setupCheck';

const goodLight: LightSample = { face: 0.45, background: 0.45 };

function pose(input: {
  headX?: number;
  headY?: number;
  span?: number;
  shoulderY?: number;
  yaw?: number;
  pitch?: number;
  faceWidth?: number;
  roll?: number;
  shoulderVisibility?: number;
  shoulders?: boolean;
} = {}): Landmarks {
  const width = 1280;
  const height = 720;
  const cameraX = (guideX: number) => (1 - guideX) * width;
  const headX = input.headX ?? 0.5;
  const headY = input.headY ?? 0.33;
  const span = input.span ?? 0.42;
  const shoulderY = input.shoulderY ?? 0.62;
  const faceW = input.faceWidth ?? 0.16;
  const faceH = 0.12;
  const showShoulders = input.shoulders !== false;
  const visibility = input.shoulderVisibility ?? 1;
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: width,
    videoHeight: height,
    nose: { x: cameraX(headX), y: headY * height + 28 },
    leftEye: { x: cameraX(headX) - 24, y: headY * height },
    rightEye: { x: cameraX(headX) + 24, y: headY * height + (input.roll ?? 0) },
    leftShoulder: showShoulders ? { x: cameraX(0.5 + span / 2), y: shoulderY * height, visibility } : undefined,
    rightShoulder: showShoulders ? { x: cameraX(0.5 - span / 2), y: shoulderY * height, visibility } : undefined,
    pitchDeg: input.pitch ?? 0,
    yawDeg: input.yaw ?? 0,
    faceBox: {
      x: 1 - (headX + faceW / 2),
      y: headY - faceH / 2,
      w: faceW,
      h: faceH,
    },
  };
}

describe('setup camera score', () => {
  it('scores 95 or more for a centered person with a long neck or wide shoulders', () => {
    const view = setupCheck(pose({ shoulderY: 0.85, span: 0.7 }), goodLight);
    expect(view.score).toBeGreaterThanOrEqual(95);
    expect(view.pill.toLowerCase()).not.toContain('sit up');
  });

  it('loses in-frame points and asks them to move back when the shoulders are out of frame', () => {
    const view = setupCheck(pose({ shoulderVisibility: 0.4 }), goodLight);
    expect(view.chips.find((chip) => chip.id === 'frame')?.passed).toBe(false);
    expect(view.pill).toBe('Move back so your shoulders show');
  });

  it('scores under 90 and asks for the face when the head is turned 30 degrees', () => {
    const view = setupCheck(pose({ yaw: 30 }), goodLight);
    expect(view.score).toBeLessThan(90);
    expect(view.pill).toBe('Turn your face toward the screen');
  });

  it('asks to raise the laptop when the camera looks up from below', () => {
    const view = setupCheck(pose({ pitch: 25 }), goodLight);
    expect(view.pill).toContain('Raise your laptop');
  });

  it('scales the outline with face width', () => {
    const narrow = outlineFit(pose({ faceWidth: 0.12 }));
    const wide = outlineFit(pose({ faceWidth: 0.24 }));
    expect(narrow).not.toBeNull();
    expect(wide!.scale).toBeCloseTo(narrow!.scale * 2, 5);
  });

  it('uses your left and your right from the mirrored preview', () => {
    expect(setupCheck(pose({ headX: 0.2 }), goodLight).pill).toBe('Move a little to your right');
    expect(setupCheck(pose({ headX: 0.85 }), goodLight).pill).toBe('Move a little to your left');
  });

  it('maps a 4:3 frame through the 16:9 cover crop', () => {
    const guide = toGuideSpace(320, 0.3725 * 480, 640, 480);
    expect(guide.x).toBeCloseTo(0.5);
    expect(guide.y).toBeCloseTo(0.33, 2);
  });

  it('does not round partial points up to full or coach posture', () => {
    const source = readFileSync(new URL('./setupCheck.ts', import.meta.url), 'utf8');
    const config = readFileSync(new URL('./config.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('roundUpAt');
    expect(config).not.toContain('roundUpAt');
    expect(source).not.toContain('Sit up so your shoulders meet the outline');
  });
});

describe('setup continue', () => {
  it('waits 5 seconds, then offers continue at 90 and good enough later', () => {
    expect(setupContinue(100, 4_000)).toBeNull();
    expect(setupContinue(90, 5_000)).toBe('Continue');
    expect(setupContinue(89, 5_000)).toBeNull();
    expect(setupContinue(75, 14_000)).toBeNull();
    expect(setupContinue(75, 15_000)).toBe('Good enough, keep going');
    expect(setupContinue(40, 24_000)).toBeNull();
    expect(setupContinue(40, 25_000)).toBe('Good enough, keep going');
  });
});

describe('setup coach voice', () => {
  it('does not speak the same line twice within 8 seconds', () => {
    const first = { line: 'Scoot back a little', atMs: 1_000 };
    expect(canSpeak('Scoot back a little', 1_000 + 7_999, first)).toBe(false);
    expect(canSpeak('Scoot back a little', 1_000 + 8_000, first)).toBe(true);
    expect(canSpeak('Come a little closer', 1_000 + 3_000, first)).toBe(false);
    expect(canSpeak('Come a little closer', 1_000 + 4_000, first)).toBe(true);
  });
});

describe('shoulder roll', () => {
  it('notices shoulders rise and then drop', () => {
    expect(shoulderRollSeen([100, 96, 90, 88, 94, 102])).toBe(true);
    expect(shoulderRollSeen([100, 100, 100, 100, 100, 100])).toBe(false);
  });
});
