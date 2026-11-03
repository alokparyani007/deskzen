import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Landmarks } from '../../lib/posture/types';
import { confidenceFromLock, glowDifferences, showGlowComparison } from './glowStats';
import { outlineFromFrames } from './glowOutline';

function frame(noseY: number, shoulder: number, iris = 20): Landmarks {
  return {
    timestampMs: 1,
    faceCount: 1,
    videoWidth: 640,
    videoHeight: 480,
    nose: { x: 320, y: noseY },
    leftEye: { x: 300, y: noseY - 20 },
    rightEye: { x: 340, y: noseY - 20 },
    leftShoulder: { x: 320 - shoulder / 2, y: 340 },
    rightShoulder: { x: 320 + shoulder / 2, y: 340 },
    leftIrisDiameterPx: iris,
    rightIrisDiameterPx: iris,
    faceBox: { x: 0.42, y: 0.2, w: 0.16, h: 0.22 },
  };
}

describe('glow up', () => {
  it('stays under 75 when only 30 of 150 lock frames were good', () => {
    const score = confidenceFromLock({ good: 30, seen: 150, stillness: 0.85, meanVisibility: 0.85, lighting: 0.85, framing: 0.85 });
    const inflated = confidenceFromLock({ good: 30, seen: 30, stillness: 0.85, meanVisibility: 0.85, lighting: 0.85, framing: 0.85 });
    expect(score).toBeLessThan(75);
    expect(score).toBeLessThan(inflated);
  });

  it('hides differences under 0.3 inches', () => {
    const zen = [frame(160, 220)];
    const slouch = [frame(168, 210)];
    const stats = glowDifferences(zen, slouch);
    expect(stats.every((stat) => stat.inches >= 0.3)).toBe(true);
    expect(stats.some((stat) => stat.inches === 0)).toBe(false);
  });

  it('hides the comparison when Catch Me gives up', () => {
    expect(showGlowComparison(true, 0)).toBe(false);
    expect(showGlowComparison(false, 4)).toBe(true);
  });

  it('builds an outline from landmarks and never reads image pixels', () => {
    const source = readFileSync(new URL('./glowOutline.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/getImageData|drawImage|HTMLVideoElement|ImageData|canvas/);
    const outline = outlineFromFrames([frame(160, 200)]);
    expect(outline?.head.rx).toBeGreaterThan(0);
    expect(outline?.leftShoulder.x).toBeLessThan(outline?.rightShoulder.x ?? 1);
  });
});
