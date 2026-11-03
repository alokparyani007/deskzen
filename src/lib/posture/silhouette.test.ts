import { describe, expect, it } from 'vitest';
import {
  alignContour,
  buildSilhouette,
  clipAtDesk,
  contourAccuracy,
  denormalizeContour,
  maskIou,
  matchTone,
  medianContour,
  normalizeContour,
  orientPersonConfidence,
  readyArt,
  scaleToVideo,
  silhouetteHasOnlyNumbers,
  silhouetteIsUsable,
  slouchIsLowerAndForward,
  usesLandmarkOutline,
  type Point,
  type Silhouette,
  type SilhouetteAnchors,
} from './silhouette';
import { dropBadSilhouettes } from '../../calibration/store';
import type { PrintLibrary } from '../../calibration/print';
import { miniMirrorKind } from '../../features/live/miniWidget';

const anchors: SilhouetteAnchors = {
  shoulderX: 16,
  shoulderY: 18,
  shoulderWidth: 10,
  eyeY: 8,
  eyeAngle: 0.2,
  deskY: 30,
};

function disk(width: number, height: number, cx: number, cy: number, radius: number): number[] {
  const values = Array.from({ length: width * height }, () => 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) values[y * width + x] = 1;
    }
  }
  return values;
}

describe('silhouette', () => {
  it('builds one closed path of 120 to 200 points', () => {
    const silhouette = buildSilhouette({ width: 32, height: 32, values: disk(32, 32, 16, 14, 8) }, anchors);
    expect(silhouette).not.toBeNull();
    expect(silhouette?.points.length).toBeGreaterThanOrEqual(120);
    expect(silhouette?.points.length).toBeLessThanOrEqual(200);
  });

  it('round-trips a normalized contour', () => {
    const source: Point[] = [
      { x: 10, y: 12 },
      { x: 20, y: 8 },
      { x: 22, y: 24 },
    ];
    const back = denormalizeContour(normalizeContour(source, anchors), anchors);
    back.forEach((point, index) => {
      expect(point.x).toBeCloseTo(source[index]!.x, 6);
      expect(point.y).toBeCloseTo(source[index]!.y, 6);
    });
  });

  it('keeps the median of rotated copies of the same shape', () => {
    const base = alignContour(oval());
    const turned = base.slice(20).concat(base.slice(0, 20));
    const shifted = base.map((point) => ({ x: point.x + 0.05, y: point.y - 0.02 }));
    const median = medianContour([base, turned, shifted]);
    const again = alignContour(median);
    again.forEach((point, index) => {
      expect(point.x).toBeCloseTo(base[index]!.x, 0);
      expect(point.y).toBeCloseTo(base[index]!.y, 0);
    });
  });

  it('stores only numbers, never an image', () => {
    const silhouette = buildSilhouette({ width: 32, height: 32, values: disk(32, 32, 16, 14, 8) }, anchors, '2026-10-26');
    expect(silhouette && silhouetteHasOnlyNumbers(silhouette)).toBe(true);
  });

  it('falls back when an older print has no silhouette', () => {
    expect(usesLandmarkOutline({})).toBe(true);
    expect(usesLandmarkOutline({ silhouette: { points: [{ x: 0, y: 0 }] } })).toBe(true);
    expect(usesLandmarkOutline({ silhouette: { points: personPoints() } })).toBe(false);
  });

  it('flips an inverted mask when the shoulders are background', () => {
    const person = disk(32, 32, 16, 14, 8);
    const inverted = person.map((value) => 1 - value);
    const oriented = orientPersonConfidence(inverted, 32, 32, [{ x: 16, y: 14 }]);
    expect(oriented.inverted).toBe(true);
    expect(oriented.values[14 * 32 + 16]).toBeGreaterThan(0.5);
  });

  it('rejects a background blob that fills the frame', () => {
    const filled = Array.from({ length: 32 * 32 }, () => 1);
    expect(buildSilhouette({ width: 32, height: 32, values: filled }, anchors)).toBeNull();
  });

  it('scales mask pixels into video pixels before normalizing', () => {
    const mask = disk(16, 12, 8, 5, 3);
    const videoAnchors = { ...anchors, shoulderX: 32, shoulderY: 20, shoulderWidth: 16, deskY: 40 };
    const shape = buildSilhouette({ width: 16, height: 12, values: mask }, videoAnchors, '', {
      videoWidth: 64,
      videoHeight: 48,
      probes: [{ x: 32, y: 20 }],
    });
    expect(shape).not.toBeNull();
    const back = denormalizeContour(shape!.points, videoAnchors);
    const center = back.reduce((sum, point) => sum + point.x, 0) / back.length;
    expect(center).toBeGreaterThan(20);
    expect(scaleToVideo([{ x: 8, y: 6 }], 16, 12, 64, 48)[0]).toEqual({ x: 32, y: 24 });
  });

  it('clips the outline to a flat desk edge', () => {
    const clipped = clipAtDesk(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
      ],
      10,
    );
    expect(clipped.length).toBeGreaterThanOrEqual(3);
    expect(clipped.every((point) => point.y <= 10.01)).toBe(true);
    expect(clipped.filter((point) => Math.abs(point.y - 10) < 0.01).length).toBeGreaterThanOrEqual(2);
  });

  it('drops a saved silhouette that fails the person check', () => {
    const library = {
      version: 2,
      prints: [{ silhouette: { points: [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }], anchors, capturedAt: '', accuracy: 1, lean: 0 } }],
    } as unknown as PrintLibrary;
    const cleaned = dropBadSilhouettes(library);
    expect(cleaned.changed).toBe(true);
    expect(cleaned.library.prints[0]?.silhouette).toBeUndefined();
  });

  it('shows the traced outline on the ready screen only when it is usable', () => {
    expect(readyArt(null)).toBe('landmark');
    expect(readyArt({ points: personPoints() })).toBe('trace');
    expect(silhouetteIsUsable({ points: [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }] })).toBe(false);
  });

  it('places the slouch silhouette lower and farther forward', () => {
    const best = shape(0, 0);
    const slouch = shape(0.2, 0.4);
    expect(slouchIsLowerAndForward(best, slouch)).toBe(true);
  });

  it('colors the match score', () => {
    expect(matchTone(92)).toBe('good');
    expect(matchTone(70)).toBe('okay');
    expect(matchTone(64)).toBe('low');
  });

  it('scores mask agreement', () => {
    expect(maskIou([1, 1, 0], [1, 0, 0])).toBeCloseTo(0.5);
    expect(contourAccuracy([[1, 1], [1, 1]])).toBe(100);
  });
});

describe('mini mirror', () => {
  it('uses the video fallback when document picture-in-picture is missing', () => {
    expect(miniMirrorKind({}, true, true)).toBe('video');
    expect(miniMirrorKind({ documentPictureInPicture: {} }, true, true)).toBe('document');
    expect(miniMirrorKind({}, false, true)).toBe('none');
  });
});

function oval(): Point[] {
  return Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return { x: Math.cos(angle) * 1.2, y: Math.sin(angle) * 1.8 - 0.4 };
  });
}

function personPoints(): Point[] {
  return [
    { x: 0, y: -1.6 },
    { x: 0.8, y: -1 },
    { x: 1.1, y: 0 },
    { x: 1.2, y: 1.4 },
    { x: 0, y: 1.6 },
    { x: -1.2, y: 1.4 },
    { x: -1.1, y: 0 },
    { x: -0.8, y: -1 },
  ];
}

function shape(lean: number, drop: number): Silhouette {
  return {
    points: [
      { x: 0, y: drop },
      { x: 1, y: drop },
      { x: 0.5, y: drop + 1 },
    ],
    anchors,
    capturedAt: '',
    accuracy: 90,
    lean,
  };
}
