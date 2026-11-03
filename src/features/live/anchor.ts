import type { Landmarks, NormPoint } from '../../lib/posture/types';
import { zenConfig } from '../zen2/zenConfig';

/**
 * Live view: keep the saved Posture Print registered to the body without letting it copy posture.
 *
 * The outline is the TARGET, so it only ever gets a translation and one uniform scale (never a rotation
 * and never a change of shape). The anchor is the SHOULDER LINE, the trunk reference:
 * - x follows the shoulder midpoint (sliding sideways in the chair is not posture);
 * - scale follows the shoulder width (moving the chair or camera closer or farther is not posture);
 * - y follows the shoulder line only within +-maxShift x shoulder width of where it was at capture.
 * A slouch drops and pushes the HEAD forward relative to the shoulders, so the head still sinks below
 * the saved dome; a big sink of the whole trunk beyond the clamp still shows as well.
 * When the shoulders are unreliable, the eyes take over x and scale only (never y: eyes move with a slouch).
 * Each value goes through a One Euro filter, so it is steady when still and keeps up when he moves.
 */
export interface Anchor {
  /** Live anchor position in live video px. */
  x: number;
  y: number;
  /** Live px per saved px. */
  scale: number;
}

export interface SavedTarget {
  video: { width: number; height: number };
  outline: readonly NormPoint[];
  points: Record<'nose' | 'leftEye' | 'rightEye' | 'leftShoulder' | 'rightShoulder', NormPoint>;
}

interface SavedFrame {
  mid: { x: number; y: number };
  width: number;
  eyeMid: { x: number; y: number };
  eyeSpan: number;
}

function savedFrame(target: SavedTarget): SavedFrame | null {
  const { width: w, height: h } = target.video;
  if (!(w > 0) || !(h > 0)) return null;
  const { leftShoulder: l, rightShoulder: r, leftEye: a, rightEye: b } = target.points;
  const width = Math.hypot((r.x - l.x) * w, (r.y - l.y) * h);
  const eyeSpan = Math.hypot((b.x - a.x) * w, (b.y - a.y) * h);
  if (!(width > 1)) return null;
  return {
    mid: { x: ((l.x + r.x) / 2) * w, y: ((l.y + r.y) / 2) * h },
    width,
    eyeMid: { x: ((a.x + b.x) / 2) * w, y: ((a.y + b.y) / 2) * h },
    eyeSpan,
  };
}

/**
 * The unfiltered anchor for this frame, or null. `previousY` keeps y when only the eyes are usable.
 */
export function measureAnchor(target: SavedTarget, frame: Landmarks, previousY: number | null): Anchor | null {
  const saved = savedFrame(target);
  if (!saved || !(frame.videoWidth > 0) || !(frame.videoHeight > 0)) return null;
  // Saved px -> live px when the camera resolution differs (same framing, different size).
  const toLiveY = frame.videoHeight / target.video.height;
  const vis = zenConfig.presenceVis;
  const l = frame.leftShoulder;
  const r = frame.rightShoulder;
  const shouldersOk = l && r && (l.visibility ?? 1) >= vis && (r.visibility ?? 1) >= vis;
  const clampY = (y: number, scale: number) => {
    const home = saved.mid.y * toLiveY;
    const reach = zenConfig.live.anchorMaxShift * saved.width * scale;
    return Math.min(home + reach, Math.max(home - reach, y));
  };
  if (shouldersOk) {
    const width = Math.hypot(r.x - l.x, r.y - l.y);
    const scale = width / saved.width;
    if (scale > 0.2) return { x: (l.x + r.x) / 2, y: clampY((l.y + r.y) / 2, scale), scale };
  }
  const a = frame.leftEye;
  const b = frame.rightEye;
  if (!a || !b || !(saved.eyeSpan > 1)) return null;
  const scale = Math.hypot(b.x - a.x, b.y - a.y) / saved.eyeSpan;
  if (!(scale > 0.2)) return null;
  const x = (a.x + b.x) / 2 + (saved.mid.x - saved.eyeMid.x) * scale;
  return { x, y: previousY ?? clampY(saved.mid.y * toLiveY, scale), scale };
}

/** One Euro filter (Casiez et al.): low jitter when still, low lag when moving. */
export class OneEuro {
  private value: number | null = null;
  private slope = 0;
  private last: number | null = null;
  private readonly minCutoff: number;
  private readonly beta: number;
  private readonly dCutoff: number;
  constructor(minCutoff: number, beta: number, dCutoff = 1) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  reset(): void {
    this.value = null;
    this.slope = 0;
    this.last = null;
  }

  filter(x: number, tMs: number): number {
    if (this.value === null || this.last === null || !(tMs > this.last)) {
      if (this.value === null) this.value = x;
      this.last = tMs;
      return this.value;
    }
    const dt = (tMs - this.last) / 1000;
    this.last = tMs;
    const slope = (x - this.value) / dt;
    this.slope += alpha(this.dCutoff, dt) * (slope - this.slope);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.slope);
    this.value += alpha(cutoff, dt) * (x - this.value);
    return this.value;
  }
}

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** Smooths x, y (live px) and scale with One Euro filters. */
export class AnchorSmoother {
  private readonly x = new OneEuro(zenConfig.live.anchorMinCutoff, zenConfig.live.anchorBeta);
  private readonly y = new OneEuro(zenConfig.live.anchorMinCutoff, zenConfig.live.anchorBeta);
  private readonly scale = new OneEuro(zenConfig.live.scaleMinCutoff, zenConfig.live.scaleBeta);
  current: Anchor | null = null;

  step(raw: Anchor | null, tMs: number): Anchor | null {
    if (!raw) return this.current;
    this.current = { x: this.x.filter(raw.x, tMs), y: this.y.filter(raw.y, tMs), scale: this.scale.filter(raw.scale, tMs) };
    return this.current;
  }

  reset(): void {
    this.x.reset();
    this.y.reset();
    this.scale.reset();
    this.current = null;
  }
}

/** Saved normalized point -> live normalized point: translation and uniform scale about the shoulder midpoint. No rotation. */
export function placeSaved(point: NormPoint, target: SavedTarget, anchor: Anchor, live: { videoWidth: number; videoHeight: number }): NormPoint {
  const saved = savedFrame(target);
  if (!saved || !(live.videoWidth > 0) || !(live.videoHeight > 0)) return { x: point.x, y: point.y };
  const px = point.x * target.video.width;
  const py = point.y * target.video.height;
  return {
    x: (anchor.x + (px - saved.mid.x) * anchor.scale) / live.videoWidth,
    y: (anchor.y + (py - saved.mid.y) * anchor.scale) / live.videoHeight,
  };
}

/** The saved target (outline and its landmarks) placed on the live body. */
export function anchoredTarget(target: SavedTarget, anchor: Anchor | null, live: { videoWidth: number; videoHeight: number }): { outline: NormPoint[]; points: SavedTarget['points'] } {
  if (!anchor) return { outline: target.outline.map((p) => ({ ...p })), points: { ...target.points } };
  // Points that sat on the frame bottom at capture stay on the frame bottom, so the loop is always
  // closed along the bottom edge (never a floating bar across the chest).
  const put = (point: NormPoint) => {
    const placed = placeSaved(point, target, anchor, live);
    return point.y >= 0.99 ? { x: placed.x, y: Math.max(placed.y, 1) } : placed;
  };
  const p = target.points;
  return {
    outline: target.outline.map(put),
    points: { nose: put(p.nose), leftEye: put(p.leftEye), rightEye: put(p.rightEye), leftShoulder: put(p.leftShoulder), rightShoulder: put(p.rightShoulder) },
  };
}
