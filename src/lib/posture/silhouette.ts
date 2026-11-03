export interface MaskGrid {
  width: number;
  height: number;
  /** Person confidence from 0 to 1, or 0 to 255. A pixel is the person at 0.5 and above. */
  values: ArrayLike<number>;
}

export interface Point {
  x: number;
  y: number;
}

export interface SilhouetteAnchors {
  shoulderX: number;
  shoulderY: number;
  shoulderWidth: number;
  eyeY: number;
  eyeAngle: number;
  deskY: number;
}

export interface Silhouette {
  points: Point[];
  anchors: SilhouetteAnchors;
  capturedAt: string;
  /** 0 to 100. How consistent the captured masks were. */
  accuracy: number;
  /** Larger means the head is farther toward the screen. */
  lean: number;
}

const CONTOUR_POINTS = 160;

export interface TraceOptions {
  videoWidth?: number;
  videoHeight?: number;
  /** Video-pixel spots that should be the person, usually the nose and shoulder midpoint. */
  probes?: Point[];
}

export function buildSilhouette(mask: MaskGrid, anchors: SilhouetteAnchors, capturedAt = '', trace: TraceOptions = {}): Silhouette | null {
  const traced = traceMask(mask, anchors, trace);
  if (traced.length < 8) return null;
  const points = normalizeContour(alignContour(traced), anchors);
  const shape = { points, anchors, capturedAt, accuracy: 100, lean: 0 };
  return silhouetteIsUsable(shape) ? shape : null;
}

/** Person outline in video pixels: polarity, the shoulder blob, scaled, clipped at the desk. */
export function traceMask(mask: MaskGrid, anchors: SilhouetteAnchors, trace: TraceOptions = {}): Point[] {
  const videoWidth = trace.videoWidth && trace.videoWidth > 0 ? trace.videoWidth : mask.width;
  const videoHeight = trace.videoHeight && trace.videoHeight > 0 ? trace.videoHeight : mask.height;
  const probes = (trace.probes ?? [{ x: anchors.shoulderX, y: anchors.shoulderY }]).map((point) => ({
    x: point.x * mask.width / videoWidth,
    y: point.y * mask.height / videoHeight,
  }));
  const oriented = orientPersonConfidence(mask.values, mask.width, mask.height, probes);
  const shoulder = probes[probes.length - 1] ?? { x: mask.width / 2, y: mask.height / 2 };
  const binary = personBlob(thresholdValues(oriented.values, mask.width, mask.height), shoulder);
  if (!binary) return [];
  const raw = marchSquares(binary.grid, binary.width, binary.height);
  const scaled = scaleToVideo(raw, mask.width, mask.height, videoWidth, videoHeight);
  return clipAtDesk(scaled, anchors.deskY);
}

/** Flip the mask when the nose and shoulders read as background. Confidence stays 0 to 1. */
export function orientPersonConfidence(values: ArrayLike<number>, width: number, height: number, probes: Point[]): { values: Float32Array; inverted: boolean } {
  let peak = 0;
  for (let index = 0; index < values.length; index += 1) peak = Math.max(peak, values[index] ?? 0);
  const scale = peak > 1 ? 255 : 1;
  let sum = 0;
  let seen = 0;
  for (const probe of probes) {
    const x = Math.max(0, Math.min(width - 1, Math.round(probe.x)));
    const y = Math.max(0, Math.min(height - 1, Math.round(probe.y)));
    sum += (values[y * width + x] ?? 0) / scale;
    seen += 1;
  }
  const inverted = seen > 0 && sum / seen < 0.5;
  const out = new Float32Array(values.length);
  for (let index = 0; index < values.length; index += 1) {
    const unit = (values[index] ?? 0) / scale;
    out[index] = inverted ? 1 - unit : unit;
  }
  return { values: out, inverted };
}

export function scaleToVideo(points: Point[], maskWidth: number, maskHeight: number, videoWidth: number, videoHeight: number): Point[] {
  return points.map((point) => ({
    x: point.x * videoWidth / Math.max(1, maskWidth),
    y: point.y * videoHeight / Math.max(1, maskHeight),
  }));
}

/** Keep the part of a closed polygon at or above the desk, with one straight bottom edge. */
export function clipAtDesk(points: Point[], deskY: number): Point[] {
  if (points.length < 3) return points.filter((point) => point.y <= deskY + 0.5);
  const next: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] ?? points[0]!;
    const following = points[(index + 1) % points.length] ?? current;
    const currentIn = current.y <= deskY + 1e-4;
    const followingIn = following.y <= deskY + 1e-4;
    if (currentIn && followingIn) next.push(following);
    else if (currentIn && !followingIn) next.push(crossDesk(current, following, deskY));
    else if (!currentIn && followingIn) {
      next.push(crossDesk(current, following, deskY));
      next.push(following);
    }
  }
  return next;
}

/** 160 points, clockwise, starting at the top of the head. */
export function alignContour(points: Point[]): Point[] {
  const sampled = resampleClosed(points, CONTOUR_POINTS);
  const clockwise = signedArea(sampled) < 0 ? [...sampled].reverse() : sampled;
  return rotateToTop(clockwise);
}

export function normalizeContour(points: Point[], anchors: SilhouetteAnchors): Point[] {
  return points.map((point) => toLocal(point, anchors));
}

export function denormalizeContour(points: Point[], anchors: SilhouetteAnchors): Point[] {
  return points.map((point) => fromLocal(point, anchors));
}

export function medianContour(contours: Point[][]): Point[] {
  const aligned = contours.filter((contour) => contour.length >= 3).map((contour) => alignContour(contour));
  if (aligned.length === 0) return [];
  const count = aligned[0]?.length ?? 0;
  const points: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const xs = aligned.map((contour) => contour[index]?.x ?? 0).sort((a, b) => a - b);
    const ys = aligned.map((contour) => contour[index]?.y ?? 0).sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    points.push({ x: xs[mid] ?? 0, y: ys[mid] ?? 0 });
  }
  return chaikinClosed(points);
}

export function maskIou(left: ArrayLike<number>, right: ArrayLike<number>): number {
  let both = 0;
  let either = 0;
  const count = Math.min(left.length, right.length);
  for (let index = 0; index < count; index += 1) {
    const a = (left[index] ?? 0) >= 0.5;
    const b = (right[index] ?? 0) >= 0.5;
    if (a || b) either += 1;
    if (a && b) both += 1;
  }
  return either === 0 ? 1 : both / either;
}

export function contourAccuracy(masks: ArrayLike<number>[]): number {
  if (masks.length < 2) return 100;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < masks.length; i += 1) {
    for (let j = i + 1; j < masks.length; j += 1) {
      const left = masks[i];
      const right = masks[j];
      if (!left || !right) continue;
      total += maskIou(left, right);
      pairs += 1;
    }
  }
  return pairs === 0 ? 100 : Math.round((total / pairs) * 100);
}

export function slouchIsLowerAndForward(best: Silhouette, slouch: Silhouette): boolean {
  return centroid(slouch.points).y > centroid(best.points).y && slouch.lean > best.lean;
}

/** A saved outline that is tiny, huge, or not centered on the shoulders is the old background trace. */
export function silhouetteIsUsable(shape: { points: Point[] } | null | undefined): boolean {
  if (!shape || shape.points.length < 8) return false;
  if (shape.points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return false;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of shape.points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const center = Math.hypot((minX + maxX) / 2, (minY + maxY) / 2);
  return width >= 0.6 && height >= 1 && width <= 8 && height <= 12 && minY < -0.15 && center <= 3;
}

export function usesLandmarkOutline(print: { silhouette?: { points: Point[] } | null }): boolean {
  return !silhouetteIsUsable(print.silhouette);
}

export function readyArt(shape: { points: Point[] } | null | undefined): 'trace' | 'landmark' {
  return silhouetteIsUsable(shape) ? 'trace' : 'landmark';
}

export function silhouetteHasOnlyNumbers(value: Silhouette): boolean {
  const encoded = JSON.stringify(value);
  if (encoded.includes('data:image') || encoded.includes('Uint8') || encoded.includes('mask')) return false;
  return value.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) && Number.isFinite(value.accuracy) && Number.isFinite(value.lean);
}

/** Emerald at 85 and above, sky from 70 to 84, amber below 70. */
export function matchTone(score: number): 'good' | 'okay' | 'low' {
  if (score >= 85) return 'good';
  if (score >= 70) return 'okay';
  return 'low';
}

export function matchCopy(score: number): string {
  if (score >= 85) return `${Math.round(score)}% match to your Posture Print`;
  if (score >= 70) return `${Math.round(score)}% match to your Posture Print`;
  return `${Math.round(score)}% match, let's reset`;
}

function centroid(points: Point[]): Point {
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / Math.max(1, points.length), y: total.y / Math.max(1, points.length) };
}

function crossDesk(from: Point, to: Point, deskY: number): Point {
  const span = to.y - from.y;
  const mix = span === 0 ? 0 : (deskY - from.y) / span;
  return { x: from.x + (to.x - from.x) * mix, y: deskY };
}

function signedArea(points: Point[]): number {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] ?? points[0]!;
    const following = points[(index + 1) % points.length] ?? current;
    sum += current.x * following.y - following.x * current.y;
  }
  return sum / 2;
}

function rotateToTop(points: Point[]): Point[] {
  if (points.length === 0) return points;
  const center = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const band = Math.max(0.5, (maxX - minX) * 0.35);
  let best = 0;
  let bestY = Infinity;
  points.forEach((point, index) => {
    if (Math.abs(point.x - center) > band) return;
    if (point.y < bestY) {
      bestY = point.y;
      best = index;
    }
  });
  return points.slice(best).concat(points.slice(0, best));
}

function thresholdValues(values: ArrayLike<number>, width: number, height: number): { grid: Uint8Array; width: number; height: number } {
  const grid = new Uint8Array(width * height);
  for (let index = 0; index < grid.length; index += 1) grid[index] = (values[index] ?? 0) >= 0.5 ? 1 : 0;
  return { grid, width, height };
}

/** The blob that contains the shoulder, unless it is the background. */
function personBlob(
  input: { grid: Uint8Array; width: number; height: number },
  shoulder: Point,
): { grid: Uint8Array; width: number; height: number } | null {
  const { width, height } = input;
  const sx = Math.max(0, Math.min(width - 1, Math.round(shoulder.x)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(shoulder.y)));
  const start = sy * width + sx;
  if (!input.grid[start]) return null;
  const seen = new Uint8Array(input.grid.length);
  const stack = [start];
  const blob: number[] = [];
  seen[start] = 1;
  let touchLeft = false;
  let touchRight = false;
  let touchTop = false;
  let touchBottom = false;
  while (stack.length > 0) {
    const current = stack.pop() ?? 0;
    blob.push(current);
    const x = current % width;
    const y = (current - x) / width;
    if (x === 0) touchLeft = true;
    if (x === width - 1) touchRight = true;
    if (y === 0) touchTop = true;
    if (y === height - 1) touchBottom = true;
    const next = [x - 1, x + 1, x, x];
    const nextY = [y, y, y - 1, y + 1];
    for (let side = 0; side < 4; side += 1) {
      const nx = next[side] ?? -1;
      const ny = nextY[side] ?? -1;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const neighbor = ny * width + nx;
      if (!input.grid[neighbor] || seen[neighbor]) continue;
      seen[neighbor] = 1;
      stack.push(neighbor);
    }
  }
  const edges = Number(touchLeft) + Number(touchRight) + Number(touchTop) + Number(touchBottom);
  if (edges >= 3 || blob.length / Math.max(1, width * height) > 0.7) return null;
  const grid = new Uint8Array(input.grid.length);
  for (const index of blob) grid[index] = 1;
  return { grid, width, height };
}

/** Outer edge of the person blob. Each step crosses from outside to inside. */
function marchSquares(grid: Uint8Array, width: number, height: number): Point[] {
  let start = -1;
  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index]) {
      start = index;
      break;
    }
  }
  if (start < 0) return [];
  const sx = start % width;
  const sy = (start - sx) / width;
  const directions = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];
  let x = sx;
  let y = sy;
  let facing = 0;
  const points: Point[] = [{ x: sx + 0.5, y: sy + 0.5 }];
  for (let guard = 0; guard < width * height; guard += 1) {
    let moved = false;
    for (let turn = 0; turn < 8; turn += 1) {
      const look = (facing + 6 + turn) % 8;
      const step = directions[look] ?? [0, 0];
      const nx = x + (step[0] ?? 0);
      const ny = y + (step[1] ?? 0);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || !grid[ny * width + nx]) continue;
      x = nx;
      y = ny;
      facing = look;
      points.push({ x: x + 0.5, y: y + 0.5 });
      moved = true;
      break;
    }
    if (!moved || (x === sx && y === sy)) break;
  }
  return points;
}

function resampleClosed(points: Point[], count: number): Point[] {
  if (points.length === 0) return [];
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) lengths.push((lengths[index - 1] ?? 0) + distance(points[index - 1] ?? points[0]!, points[index]!));
  lengths.push((lengths[lengths.length - 1] ?? 0) + distance(points[points.length - 1] ?? points[0]!, points[0]!));
  const total = lengths[lengths.length - 1] ?? 0;
  if (total === 0) return points.slice(0, count);
  const chain = [...points, points[0]!];
  const sampled: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const target = (total * index) / count;
    let at = 1;
    while (at < lengths.length && (lengths[at] ?? 0) < target) at += 1;
    const end = Math.min(chain.length - 1, at);
    const start = Math.max(0, end - 1);
    const span = (lengths[end] ?? 0) - (lengths[start] ?? 0);
    const mix = span === 0 ? 0 : (target - (lengths[start] ?? 0)) / span;
    const a = chain[start] ?? chain[0]!;
    const b = chain[end] ?? a;
    sampled.push({ x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix });
  }
  return sampled;
}

function chaikinClosed(points: Point[]): Point[] {
  const next: Point[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] ?? points[0]!;
    const following = points[(index + 1) % points.length] ?? current;
    next.push({ x: current.x * 0.75 + following.x * 0.25, y: current.y * 0.75 + following.y * 0.25 });
    next.push({ x: current.x * 0.25 + following.x * 0.75, y: current.y * 0.25 + following.y * 0.75 });
  }
  return next;
}

function toLocal(point: Point, anchors: SilhouetteAnchors): Point {
  const dx = point.x - anchors.shoulderX;
  const dy = point.y - anchors.shoulderY;
  const turned = rotate(dx, dy, -anchors.eyeAngle);
  const scale = Math.max(anchors.shoulderWidth, 1e-6);
  return { x: turned.x / scale, y: turned.y / scale };
}

function fromLocal(point: Point, anchors: SilhouetteAnchors): Point {
  const scale = Math.max(anchors.shoulderWidth, 1e-6);
  const turned = rotate(point.x * scale, point.y * scale, anchors.eyeAngle);
  return { x: anchors.shoulderX + turned.x, y: anchors.shoulderY + turned.y };
}

function rotate(x: number, y: number, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const PERSON_CONFIDENCE = 0.6;
const CHAIR_MARGIN = 0.35;
const BOTTOM_MARGIN = 0.6;
const LEVEL_LIMIT = (4 * Math.PI) / 180;

export interface PersonCut {
  nose: Point;
  left: Point;
  right: Point;
  /** Head ellipse in mask pixels. Above the shoulders, pixels outside it are dropped. */
  face: { cx: number; cy: number; rx: number; ry: number } | null;
}

/** Pick the mask whose nose and shoulders read as the person, not the background. */
export function choosePersonValues(masks: ArrayLike<number>[], width: number, height: number, probes: Point[]): Float32Array {
  if (masks.length === 0) return new Float32Array();
  let best = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < masks.length; index += 1) {
    const values = masks[index];
    if (!values) continue;
    let sum = 0;
    let seen = 0;
    for (const probe of probes) {
      const x = Math.max(0, Math.min(width - 1, Math.round(probe.x)));
      const y = Math.max(0, Math.min(height - 1, Math.round(probe.y)));
      sum += values[y * width + x] ?? 0;
      seen += 1;
    }
    const score = seen === 0 ? 0 : sum / seen;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  }
  const chosen = masks[best] ?? masks[0];
  if (!chosen) return new Float32Array();
  return chosen instanceof Float32Array ? chosen : Float32Array.from(chosen);
}

/** Mean of the last 8 to 12 masks. Fewer samples still average, so one frame is never the whole trace. */
export function averageMasks(samples: MaskGrid[], keep = 12): MaskGrid | null {
  const used = samples.slice(-keep);
  if (used.length === 0) return null;
  const first = used[0];
  if (!first) return null;
  const same = used.filter((sample) => sample.width === first.width && sample.height === first.height && sample.values.length === first.values.length);
  if (same.length === 0) return null;
  const values = new Float32Array(first.values.length);
  for (const sample of same) {
    for (let index = 0; index < values.length; index += 1) values[index] += sample.values[index] ?? 0;
  }
  for (let index = 0; index < values.length; index += 1) values[index] /= same.length;
  return { width: first.width, height: first.height, values };
}

/**
 * Person pixels only: the component that holds the nose and both shoulders,
 * then the chair, the hair ellipse, and a flat cut below the shoulders.
 */
export function cleanPersonGrid(values: ArrayLike<number>, width: number, height: number, cut: PersonCut): Uint8Array | null {
  const binary = new Uint8Array(width * height);
  let peak = 0;
  for (let index = 0; index < values.length; index += 1) peak = Math.max(peak, values[index] ?? 0);
  const scale = peak > 1 ? 255 : 1;
  for (let index = 0; index < binary.length; index += 1) binary[index] = (values[index] ?? 0) / scale >= PERSON_CONFIDENCE ? 1 : 0;
  const body = componentWithAnchors(binary, width, height, [cut.nose, cut.left, cut.right]);
  if (!body) return null;
  const shoulderWidth = Math.hypot(cut.right.x - cut.left.x, cut.right.y - cut.left.y);
  if (shoulderWidth < 1) return null;
  const shoulderY = (cut.left.y + cut.right.y) / 2;
  const leftLimit = Math.min(cut.left.x, cut.right.x) - CHAIR_MARGIN * shoulderWidth;
  const rightLimit = Math.max(cut.left.x, cut.right.x) + CHAIR_MARGIN * shoulderWidth;
  const bottom = shoulderY + BOTTOM_MARGIN * shoulderWidth;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!body[index]) continue;
      if (x < leftLimit || x > rightLimit || y > bottom) {
        body[index] = 0;
        continue;
      }
      if (y < shoulderY) {
        const midX = (cut.left.x + cut.right.x) / 2;
        const inNeck = Math.abs(x + 0.5 - midX) <= shoulderWidth * 0.28;
        const inHead = cut.face
          ? ((x + 0.5 - cut.face.cx) / Math.max(cut.face.rx, 1e-3)) ** 2 + ((y + 0.5 - cut.face.cy) / Math.max(cut.face.ry, 1e-3)) ** 2 <= 1
          : false;
        if (!inHead && !inNeck) body[index] = 0;
      }
    }
  }
  return componentWithAnchors(body, width, height, [cut.nose, cut.left, cut.right]);
}

/** Outer edge of a prepared person grid. */
export function traceBinary(grid: Uint8Array, width: number, height: number): Point[] {
  return marchSquares(grid, width, height);
}

/** Level the shoulder line only for a tilt under 4 degrees. A real lean stays. */
export function levelShoulderLine(points: Point[], left: Point, right: Point): { points: Point[]; leveled: boolean } {
  const tilt = Math.atan2(right.y - left.y, right.x - left.x);
  if (!Number.isFinite(tilt) || Math.abs(tilt) >= LEVEL_LIMIT) return { points, leveled: false };
  const pivot = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const cos = Math.cos(-tilt);
  const sin = Math.sin(-tilt);
  return {
    leveled: true,
    points: points.map((point) => {
      const dx = point.x - pivot.x;
      const dy = point.y - pivot.y;
      return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
    }),
  };
}

/** Too wide, or a head top that is not over the shoulders, is a chair or background trace. */
export function outlineIsSane(points: Point[], shoulderX: number, shoulderWidth: number): boolean {
  if (points.length < 8 || shoulderWidth <= 0) return false;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
  }
  if (maxX - minX > 2.2 * shoulderWidth) return false;
  const crown = points.filter((point) => point.y <= minY + shoulderWidth * 0.08);
  const crownX = crown.reduce((sum, point) => sum + point.x, 0) / Math.max(1, crown.length);
  return Math.abs(crownX - shoulderX) <= 0.3 * shoulderWidth;
}

/** One light average, then 160 points. Keeps the hair and ear curve without spikes. */
export function smoothContour(points: Point[]): Point[] {
  if (points.length < 3) return points;
  const count = points.length;
  const averaged = points.map((point, index) => {
    const previous = points[(index - 1 + count) % count] ?? point;
    const next = points[(index + 1) % count] ?? point;
    return { x: previous.x * 0.2 + point.x * 0.6 + next.x * 0.2, y: previous.y * 0.2 + point.y * 0.6 + next.y * 0.2 };
  });
  return alignContour(averaged);
}

function componentWithAnchors(grid: Uint8Array, width: number, height: number, anchors: Point[]): Uint8Array | null {
  const snapped = anchors.map((point) => snapOn(grid, width, height, point));
  if (snapped.some((point) => point === null)) return null;
  const seed = snapped[0];
  if (!seed) return null;
  const start = Math.round(seed.y) * width + Math.round(seed.x);
  if (!grid[start]) return null;
  const seen = new Uint8Array(grid.length);
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const current = stack.pop() ?? 0;
    const x = current % width;
    const y = (current - x) / width;
    const nextX = [x - 1, x + 1, x, x];
    const nextY = [y, y, y - 1, y + 1];
    for (let side = 0; side < 4; side += 1) {
      const nx = nextX[side] ?? -1;
      const ny = nextY[side] ?? -1;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const neighbor = ny * width + nx;
      if (!grid[neighbor] || seen[neighbor]) continue;
      seen[neighbor] = 1;
      stack.push(neighbor);
    }
  }
  for (const point of snapped) {
    if (!point || !seen[Math.round(point.y) * width + Math.round(point.x)]) return null;
  }
  return seen;
}

function snapOn(grid: Uint8Array, width: number, height: number, point: Point): Point | null {
  const x = Math.round(point.x);
  const y = Math.round(point.y);
  let best: Point | null = null;
  let bestDistance = Infinity;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || !grid[ny * width + nx]) continue;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq < bestDistance) {
        bestDistance = distanceSq;
        best = { x: nx, y: ny };
      }
    }
  }
  return best;
}
