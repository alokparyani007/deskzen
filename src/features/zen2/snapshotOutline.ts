import type { Landmarks, NormPoint } from '../../lib/posture/types';
import { outlineIsSane, type MaskGrid, type Point } from '../../lib/posture/silhouette';
import { zenConfig, type PoseMode } from './zenConfig';

export type OutlineReason = 'ok' | 'trace-failed' | 'shoulder-cut';

export interface OutlineTrace {
  points: NormPoint[] | null;
  reason: OutlineReason;
  /** Shoulder sides drawn from the landmark-guided curve because the mask failed there. */
  guided?: { left: boolean; right: boolean };
}

/**
 * Square-pixel working grid in the camera frame's own aspect ratio.
 * One grid pixel is `1 / scale` video pixels on BOTH axes, so distances are the same
 * horizontally and vertically (a 256x256 or 144x256 mask is never traced stretched).
 */
export interface TraceGrid {
  width: number;
  height: number;
  /** Grid pixels per video pixel. */
  scale: number;
  values: Float32Array;
}

export interface Body {
  noseX: number;
  noseY: number;
  leftX: number;
  rightX: number;
  shoulderY: number;
  sw: number;
  head: { cx: number; cy: number; rx: number; top: number; chin: number; faceHalf: number };
  /** Clean multiclass snapshot: also apply the measured neck-to-shoulder profile (see shoulderProfile). */
  profile?: boolean;
  /** Arm limit past each shoulder point (x shoulder width). The clean multiclass mask gets a wider one. */
  armMargin?: number;
}

/**
 * Trace the real person outline from ONE segmentation mask.
 * 1. Bilinear-upsample the confidence mask to a square-pixel grid with the video's aspect.
 * 2. Threshold, keep the connected component that holds the nose, fill holes.
 * 3. Light landmark clamps: head within the widened face box, arms within the shoulder span
 *    plus a margin (drops the chair), body down to the frame bottom or torsoDepth.
 * 4. Follow the exact outer pixel boundary, smooth lightly, resample evenly.
 * Output is normalized, unmirrored camera space (x / videoWidth, y / videoHeight).
 */
export interface TraceOptions {
  /**
   * The mask is the multiclass selfie segmenter's person classes (hair + face + body skin + clothes),
   * which already leaves the chair out: use its own high-confidence threshold and only loose sanity
   * limits on the head, so the line sits on the real hair, face and shoulder edge.
   */
  clean?: boolean;
}

/** A person mask, optionally with the multiclass "others" channel (glasses, hats, headphones), same size. */
export interface SnapshotMask extends MaskGrid {
  others?: ArrayLike<number> | null;
  /** The multiclass clothes channel, same size. */
  clothes?: ArrayLike<number> | null;
}

export function outlineFromMask(mask: SnapshotMask, frame: Landmarks, _mode: PoseMode, image?: SnapshotPixels | null, options: TraceOptions = {}): OutlineTrace {
  const fail: OutlineTrace = { points: null, reason: 'trace-failed' };
  const videoWidth = frame.videoWidth;
  const videoHeight = frame.videoHeight;
  if (!(videoWidth > 0) || !(videoHeight > 0) || mask.width <= 0 || mask.height <= 0 || mask.values.length < mask.width * mask.height) return fail;
  const grid = upsampleMask(mask, videoWidth, videoHeight, zenConfig.traceGrid);
  const placed = placement(frame, grid);
  if (!placed) return fail;
  // Clean multiclass mask: the chair is already left out, so the arms may reach further past the
  // shoulders (sitting close to the camera) before the clamp, the shoulder check and the width check.
  const body: Body = options.clean ? { ...placed, armMargin: zenConfig.multiclass.armMargin } : placed;
  let binary: Uint8Array;
  if (options.clean) {
    // Glasses or a hat come back as "others": count them as the person inside the head zone only,
    // and use a softer threshold there, so a glasses band can never split the head off the body.
    if (mask.others && mask.others.length >= mask.width * mask.height) {
      const others = upsampleMask({ width: mask.width, height: mask.height, values: mask.others }, videoWidth, videoHeight, zenConfig.traceGrid).values;
      addInHeadZone(grid.values, others, grid.width, grid.height, body);
    }
    // Beside the head and well above the chin there are no clothes: a chair back there is read as
    // clothes with shirt-like confidence, so drop the clothes share of the person value there.
    if (mask.clothes && mask.clothes.length >= mask.width * mask.height) {
      const clothes = upsampleMask({ width: mask.width, height: mask.height, values: mask.clothes }, videoWidth, videoHeight, zenConfig.traceGrid).values;
      dropClothesBesideHead(grid.values, clothes, grid.width, grid.height, body);
    }
    binary = thresholdHeadZone(grid.values, grid.width, grid.height, body, zenConfig.multiclass.threshold, zenConfig.multiclass.headThreshold);
  } else binary = thresholdGrid(grid.values, zenConfig.maskThreshold);
  // Fill holes FIRST, then keep the piece that covers most of the face (forehead to chin), not
  // whatever touches one nose pixel.
  fillHoles(binary, grid.width, grid.height);
  const person = bodyComponent(binary, grid.width, grid.height, body);
  if (!person) return fail;
  clampToBody(person, grid.values, grid.width, grid.height, options.clean ? loosenHead(body) : body);
  const first = bodyComponent(person, grid.width, grid.height, body);
  if (!first) return fail;
  fillHoles(first, grid.width, grid.height);
  const guided = guideShoulders(first, grid.width, grid.height, body);
  const kept = guided.left || guided.right ? bodyComponent(first, grid.width, grid.height, body) : first;
  if (!kept) return fail;
  if (guided.left || guided.right) fillHoles(kept, grid.width, grid.height);
  if (image) {
    const cut = refineShirtEdge(kept, grid.values, grid.width, grid.height, body, image, grid.scale, videoWidth, videoHeight);
    if (cut.left || cut.right) {
      const again = bodyComponent(kept, grid.width, grid.height, body);
      if (again) kept.set(again);
    }
  }
  // Round every limit seam: an opening rounds convex corners (shoulder caps, crown) and a closing
  // fills concave steps (the neck-to-shoulder fillet). Edges that leave the frame stay straight.
  const open = options.clean ? zenConfig.multiclass.shapeOpen : zenConfig.shapeOpen;
  const close = options.clean ? zenConfig.multiclass.shapeClose : zenConfig.shapeClose;
  softenShape(kept, grid.width, grid.height, open * body.sw, close * body.sw);
  // The rounding can split off a thin bit (a hair wisp, an ear, a sliver of chair). Keep ONLY the body
  // component at the nose, holes filled, so the trace is one closed loop around the person.
  const single = bodyComponent(kept, grid.width, grid.height, body);
  if (!single) return fail;
  kept.set(single);
  fillHoles(kept, grid.width, grid.height);
  const capRows = Math.min(grid.height, Math.ceil(body.shoulderY + zenConfig.shoulderCapMargin * body.sw));
  const edge = touchesSide(kept, grid.width, capRows);
  const raw = traceOuter(kept, grid.width, grid.height);
  if (raw.length < 8) return { points: null, reason: edge ? 'shoulder-cut' : 'trace-failed' };
  let bottom = 0;
  for (const point of raw) bottom = Math.max(bottom, point.y);
  const light = smoothClosed(raw, zenConfig.outlineSmoothWindow, zenConfig.outlineSmoothPasses);
  const smooth = smoothArms(light, body.shoulderY, body.sw, bottom);
  const sampled = resampleClosed(smooth, zenConfig.outlinePoints);
  for (const point of sampled) if (point.y > bottom - 1.5) point.y = bottom;
  const loop = evenLoop(sampled, zenConfig.outlinePoints);
  const video = loop.map((point) => ({ x: point.x / grid.scale, y: point.y / grid.scale }));
  const shoulderX = (body.leftX + body.rightX) / 2 / grid.scale;
  const shoulderWidth = body.sw / grid.scale;
  // The width check grows with the arm limit (2.2 x shoulder width at the default armMargin).
  const maxWidth = 2.2 + 2 * Math.max(0, (body.armMargin ?? zenConfig.armMargin) - zenConfig.armMargin);
  const sane = outlineIsSane(video, shoulderX, shoulderWidth, maxWidth) && areaOk(video, videoWidth, videoHeight) && headAbove(video, body.shoulderY / grid.scale);
  // Sanity: the line must go over the head. If its top above the face is below the eyes, the mask
  // lost the head (a glasses gap split it off): reject, so the caller falls back to the binary mask.
  if (!headCovered(video, body, frame, grid.scale)) return { ...fail, guided };
  const points = video.map((point) => ({ x: clamp01(point.x / videoWidth), y: clamp01(point.y / videoHeight) }));
  if (points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) return fail;
  if (edge || outlineTouchesEdge(points, capRows / grid.height)) return { points: sane ? points : null, reason: 'shoulder-cut', guided };
  if (!sane) return { ...fail, guided };
  return { points, reason: 'ok', guided };
}

/** Bilinear upsample of a person confidence mask (0..1 or 0..255) that covers the whole frame. */
export function upsampleMask(mask: MaskGrid, videoWidth: number, videoHeight: number, longSide: number): TraceGrid {
  const scale = longSide / Math.max(videoWidth, videoHeight);
  const width = Math.max(1, Math.round(videoWidth * scale));
  const height = Math.max(1, Math.round(videoHeight * scale));
  let peak = 0;
  for (let index = 0; index < mask.values.length; index += 1) peak = Math.max(peak, mask.values[index] ?? 0);
  const unit = peak > 1 ? 1 / 255 : 1;
  const values = new Float32Array(width * height);
  const mw = mask.width;
  const mh = mask.height;
  const at = (x: number, y: number) => (mask.values[y * mw + x] ?? 0) * unit;
  for (let y = 0; y < height; y += 1) {
    const my = Math.min(mh - 1, Math.max(0, ((y + 0.5) / height) * mh - 0.5));
    const y0 = Math.floor(my);
    const y1 = Math.min(mh - 1, y0 + 1);
    const fy = my - y0;
    for (let x = 0; x < width; x += 1) {
      const mx = Math.min(mw - 1, Math.max(0, ((x + 0.5) / width) * mw - 0.5));
      const x0 = Math.floor(mx);
      const x1 = Math.min(mw - 1, x0 + 1);
      const fx = mx - x0;
      const top = at(x0, y0) * (1 - fx) + at(x1, y0) * fx;
      const low = at(x0, y1) * (1 - fx) + at(x1, y1) * fx;
      values[y * width + x] = top * (1 - fy) + low * fy;
    }
  }
  return { width, height, scale, values };
}

/**
 * One closed, evenly spaced loop: if any step (including last -> first) is longer than
 * 3 x the median step, resample along the true contour again so the line never jumps a gap.
 */
export function evenLoop(points: readonly Point[], count: number): Point[] {
  if (points.length < 3) return [...points];
  const steps = loopSteps(points);
  const median = [...steps].sort((a, b) => a - b)[steps.length >> 1] ?? 0;
  if (median > 0 && Math.max(...steps) <= 3 * median) return [...points];
  return resampleClosed(points, count);
}

/** Distances between consecutive points of a closed loop, including the closing step. */
export function loopSteps(points: readonly Point[]): number[] {
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length]!;
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
}

export function resampleClosed(points: readonly Point[], count: number): Point[] {
  if (points.length === 0 || count <= 0) return [];
  if (points.length === 1) return Array.from({ length: count }, () => ({ x: points[0]!.x, y: points[0]!.y }));
  const chain = [...points, points[0]!];
  const lengths = [0];
  for (let index = 1; index < chain.length; index += 1) {
    const previous = chain[index - 1] ?? chain[0]!;
    const current = chain[index] ?? previous;
    lengths.push((lengths[index - 1] ?? 0) + Math.hypot(current.x - previous.x, current.y - previous.y));
  }
  const total = lengths[lengths.length - 1] ?? 0;
  if (total <= 0) return Array.from({ length: count }, () => ({ x: points[0]!.x, y: points[0]!.y }));
  const sampled: Point[] = [];
  let at = 1;
  for (let index = 0; index < count; index += 1) {
    const target = (total * index) / count;
    while (at < lengths.length - 1 && (lengths[at] ?? 0) < target) at += 1;
    const end = Math.min(chain.length - 1, at);
    const start = Math.max(0, end - 1);
    const span = (lengths[end] ?? 0) - (lengths[start] ?? 0);
    const mix = span <= 0 ? 0 : (target - (lengths[start] ?? 0)) / span;
    const a = chain[start] ?? chain[0]!;
    const b = chain[end] ?? a;
    sampled.push({ x: a.x + (b.x - a.x) * mix, y: a.y + (b.y - a.y) * mix });
  }
  return sampled;
}

/**
 * Exact outer boundary of a filled binary blob, as pixel-corner vertices, clockwise on screen.
 * Every vertex is kept (no simplification). Diagonal pinches turn right (4-connected).
 */
export function traceOuter(grid: Uint8Array, width: number, height: number): Point[] {
  let start = -1;
  for (let index = 0; index < grid.length; index += 1) {
    if (grid[index]) {
      start = index;
      break;
    }
  }
  if (start < 0) return [];
  const fg = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && grid[y * width + x] === 1;
  const stride = width + 1;
  const out = new Uint8Array(stride * (height + 1));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!fg(x, y)) continue;
      if (!fg(x, y - 1)) out[y * stride + x] |= 1; // top edge, heading +x
      if (!fg(x + 1, y)) out[y * stride + x + 1] |= 2; // right edge, heading +y
      if (!fg(x, y + 1)) out[(y + 1) * stride + x + 1] |= 4; // bottom edge, heading -x
      if (!fg(x - 1, y)) out[(y + 1) * stride + x] |= 8; // left edge, heading -y
    }
  }
  const dx = [1, 0, -1, 0];
  const dy = [0, 1, 0, -1];
  const sx = start % width;
  const sy = (start - sx) / width;
  let x = sx;
  let y = sy;
  let dir = 0;
  const points: Point[] = [];
  for (let guard = 0; guard < out.length * 2; guard += 1) {
    points.push({ x, y });
    x += dx[dir] ?? 0;
    y += dy[dir] ?? 0;
    if (x === sx && y === sy) break;
    const bits = out[y * stride + x] ?? 0;
    const order = [(dir + 1) % 4, dir, (dir + 3) % 4];
    const next = order.find((candidate) => (bits & (1 << candidate)) !== 0);
    if (next === undefined) return [];
    dir = next;
  }
  return points;
}

function placement(frame: Landmarks, grid: TraceGrid): Body | null {
  const nose = frame.nose;
  const left = frame.leftShoulder;
  const right = frame.rightShoulder;
  if (!nose || !left || !right) return null;
  const s = grid.scale;
  const leftX = left.x * s;
  const rightX = right.x * s;
  const shoulderY = ((left.y + right.y) / 2) * s;
  const sw = Math.hypot(right.x - left.x, right.y - left.y) * s;
  if (sw < 1) return null;
  const noseX = nose.x * s;
  const noseY = nose.y * s;
  const box = frame.faceBox;
  let head: Body['head'];
  if (box && box.w > 0 && box.h > 0) {
    const fw = box.w * grid.width;
    const fh = box.h * grid.height;
    const faceTop = box.y * grid.height;
    head = { cx: headCenterX(frame, (box.x + box.w / 2) * grid.width, s), cy: faceTop + fh / 2, rx: (fw / 2) * zenConfig.headWiden, top: faceTop - fh * zenConfig.hairRise, chin: faceTop + fh, faceHalf: fw / 2 };
  } else {
    const fw = sw * 0.45;
    const fh = fw * 1.3;
    const faceTop = noseY - fh * 0.6;
    head = { cx: noseX, cy: faceTop + fh / 2, rx: (fw / 2) * zenConfig.headWiden, top: faceTop - fh * zenConfig.hairRise, chin: faceTop + fh, faceHalf: fw / 2 };
  }
  return { noseX, noseY, leftX, rightX, shoulderY, sw, head };
}

/** Face-box centre, pulled halfway to the ear midpoint when both ears are seen (a slight yaw shifts the face box). */
function headCenterX(frame: Landmarks, faceCenter: number, scale: number): number {
  const a = frame.leftEar;
  const b = frame.rightEar;
  if (!a || !b || (a.visibility ?? 0) < zenConfig.presenceVis || (b.visibility ?? 0) < zenConfig.presenceVis) return faceCenter;
  return (faceCenter + ((a.x + b.x) / 2) * scale) / 2;
}

/**
 * Per-pixel landmark clamps, so the mask can only make the outline SMALLER than these limits:
 * - Head: a dome from the hair crown (face top - hairRise x face height) to the face middle,
 *   then headWiden x the face width down to the chin, then the neck (neckWiden x face width).
 * - Shoulder band (chin to shoulder line): the top edge may not rise more than trapLift x shoulder
 *   width above the straight line from the neck base (chin level) to each shoulder landmark; past
 *   the landmark it stays at that height. Mask confidence below bandThreshold counts as unsure there
 *   and is dropped (a dark chair merged with the shirt is usually 0.5 to 0.75).
 * - Below the shoulder line: the shoulder span plus armMargin, down to torsoDepth or the frame bottom.
 * If the hair runs off the top of the frame, the head is closed with the dome arc instead.
 */
/**
 * Loose shoulder guard: the highest allowed y in a column (smaller y is higher on screen).
 * It is only a backstop against a chair back far above the shoulders; the mask is the shape.
 * The pose shoulder landmarks sit low on the upper chest by a varying amount (8 to 15% of the frame
 * when sitting close), so the plateau is anchored to whichever is higher: trapLift above the
 * landmarks or guardCapBelowChin below the chin, then guardSlack more room. From the neck base it
 * rises outward along a steep ramp (keeps the jaw-to-neck join close) and a gentle quadratic, then
 * rounds down over the shoulder cap as a quarter ellipse to the arm limit. No corners anywhere.
 */
function shoulderGuard(body: Body): (px: number) => number {
  const left = Math.min(body.leftX, body.rightX) - zenConfig.armMargin * body.sw;
  const right = Math.max(body.leftX, body.rightX) + zenConfig.armMargin * body.sw;
  const { cx, faceHalf } = body.head;
  const sw = body.sw;
  const sy = body.shoulderY;
  const chin = body.head.chin;
  const neckHalf = faceHalf * zenConfig.neckWiden;
  const leftSX = Math.min(body.leftX, body.rightX);
  const rightSX = Math.max(body.leftX, body.rightX);
  const capDrop = zenConfig.capDrop * sw;
  const slack = zenConfig.guardSlack * sw;
  const high = chin - zenConfig.guardNeckRise * sw;
  const low = Math.max(high, Math.min(sy - zenConfig.trapLift * sw, chin + zenConfig.guardCapBelowChin * sw));
  return (px: number) => {
    const side = px < cx ? -1 : 1;
    const baseX = cx + side * neckHalf;
    const sx = side < 0 ? leftSX : rightSX;
    const plateauX = sx + side * zenConfig.capPlateau * sw;
    const armX = side < 0 ? left : right;
    const d = side * (px - baseX);
    const run = Math.max(1, side * (plateauX - baseX));
    // Right beside the neck: no higher than a steep ramp up from the chin (no flare under the jaw).
    const ramp = chin - Math.max(0, d) * zenConfig.neckRamp;
    let curve: number;
    if (d <= 0) curve = high;
    else if (d <= run) {
      const u = d / run;
      curve = high + (low - high) * (1 - (1 - u) * (1 - u));
    } else {
      const a = Math.max(1, side * (armX - plateauX));
      const dx = Math.min(d - run, a) / a;
      curve = low + capDrop * (1 - Math.sqrt(Math.max(0, 1 - dx * dx)));
    }
    return Math.max(curve - slack, ramp);
  };
}

/** RGBA pixels of the snapshot, in memory only (an ImageData or the same shape). Never stored. */
export interface SnapshotPixels {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

/**
 * Snapshot only: where the mask has swallowed a dark chair right above the shoulders, find the real
 * shirt top in the picture. Deliberately cautious (a grey tee in uneven light has folds and shading):
 * - Per column in the shoulder band, scan down from the mask top at most edgeMaxDrop x frame height.
 * - Take the FIRST (highest) row where the rows below match the shirt colour and the rows above are
 *   clearly the chair: a sharp local step (edgeStep), at least edgeDarker darker than the shirt,
 *   not the wall/background colour, and a different hue from the shirt. Shading and folds on the
 *   shirt keep the shirt's hue, so they never qualify.
 * - Median + moving average of the edges, cut the mask DOWN only; no edge keeps the mask.
 */
export function refineShirtEdge(grid: Uint8Array, values: Float32Array, width: number, height: number, body: Body, image: SnapshotPixels, scale: number, videoWidth: number, videoHeight: number): { left: number; right: number } {
  const done = { left: 0, right: 0 };
  if (image.width <= 0 || image.height <= 0 || image.data.length < image.width * image.height * 4) return done;
  const ix = image.width / videoWidth / scale;
  const iy = image.height / videoHeight / scale;
  type Rgb = [number, number, number];
  const rgb = (gx: number, gy: number): Rgb => {
    const x = Math.min(image.width - 1, Math.max(0, Math.floor(gx * ix)));
    const y = Math.min(image.height - 1, Math.max(0, Math.floor(gy * iy)));
    const at = (y * image.width + x) * 4;
    return [image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0];
  };
  const lum = (c: Rgb) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const hue = (c: Rgb) => {
    const sum = Math.max(1, c[0] + c[1] + c[2]);
    return [c[0] / sum, c[1] / sum] as const;
  };
  const { cx, faceHalf } = body.head;
  const sw = body.sw;
  const sy = body.shoulderY;
  const leftSX = Math.min(body.leftX, body.rightX);
  const rightSX = Math.max(body.leftX, body.rightX);
  const neckHalf = faceHalf * zenConfig.neckWiden;
  const chin = Math.min(body.head.chin, sy - 0.1 * sw);
  const medianOf = (list: Rgb[]): Rgb => [0, 1, 2].map((c) => median(list.map((item) => item[c]!))) as Rgb;
  // Shirt colour: median of a chest patch between the shoulders, just below the neck.
  const patch: Rgb[] = [];
  for (let gy = Math.floor(sy); gy < Math.min(height, sy + zenConfig.shirtPatch * sw); gy += 1) {
    for (let gx = Math.floor(cx - zenConfig.shirtPatch * sw); gx < cx + zenConfig.shirtPatch * sw; gx += 1) {
      if (gx >= 0 && gx < width && grid[gy * width + gx]) patch.push(rgb(gx + 0.5, gy + 0.5));
    }
  }
  if (patch.length < 20) return done;
  const shirt = medianOf(patch);
  let spread = 0;
  for (const item of patch) spread += Math.hypot(item[0] - shirt[0], item[1] - shirt[1], item[2] - shirt[2]);
  spread /= patch.length;
  const tol = Math.max(zenConfig.shirtTolMin, zenConfig.shirtTolSpread * spread);
  const far = (a: Rgb, b: Rgb) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const shirtLum = lum(shirt);
  const shirtHue = hue(shirt);
  // Background (wall) colour: off-person pixels beside the head at shoulder-band height.
  const wall: Rgb[] = [];
  for (let gy = Math.max(0, Math.floor(chin - 0.3 * sw)); gy < Math.min(height, chin); gy += 2) {
    for (let gx = 0; gx < width; gx += 2) {
      const index = gy * width + gx;
      if (!grid[index] && (values[index] ?? 0) < 0.3 && gx > leftSX - 0.6 * sw && gx < rightSX + 0.6 * sw) wall.push(rgb(gx + 0.5, gy + 0.5));
    }
  }
  const background = wall.length >= 10 ? medianOf(wall) : null;
  const isChair = (c: Rgb) => {
    if (lum(c) > (1 - zenConfig.edgeDarker) * shirtLum) return false;
    if (background && far(c, background) < tol) return false;
    const h = hue(c);
    return Math.hypot(h[0] - shirtHue[0], h[1] - shirtHue[1]) > zenConfig.edgeHueOff;
  };
  const win = Math.max(2, Math.round(zenConfig.edgeWindow * sw));
  const maxDrop = zenConfig.edgeMaxDrop * height;
  const topOf = (x: number) => {
    const startY = Math.max(0, Math.floor(chin));
    for (let y = startY; y < height; y += 1) if (grid[y * width + x]) return y;
    return -1;
  };
  for (const side of [-1, 1] as const) {
    const sx = side < 0 ? leftSX : rightSX;
    const from = cx + side * (neckHalf + 1);
    const to = sx + side * zenConfig.edgeReach * sw;
    const columns: number[] = [];
    for (let x = Math.round(from); side < 0 ? x >= Math.round(to) : x <= Math.round(to); x += side) if (x >= 0 && x < width) columns.push(x);
    if (columns.length < 5) continue;
    const tops = columns.map(topOf);
    const edges = columns.map((x, index) => {
      const top = tops[index]!;
      if (top < 0) return NaN;
      const colour = (gy: number): Rgb => {
        const a = rgb(x - 0.5, gy);
        const b = rgb(x + 0.5, gy);
        const c = rgb(x + 1.5, gy);
        return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      };
      const average = (y0: number, y1: number): Rgb => {
        const list: Rgb[] = [];
        for (let y = y0; y < y1; y += 1) list.push(colour(y + 0.5));
        return [0, 1, 2].map((c) => list.reduce((sum, item) => sum + item[c]!, 0) / Math.max(1, list.length)) as Rgb;
      };
      const end = Math.min(height - win, top + maxDrop);
      for (let y = top + win; y <= end; y += 1) {
        const below = average(y, y + win);
        if (far(below, shirt) > tol) continue;
        const above = average(y - win, y);
        // A real chair-to-shirt boundary is a sharp local step, not a slow shading gradient.
        if (lum(above) > zenConfig.edgeStep * lum(below)) continue;
        if (isChair(above)) return y;
      }
      return NaN;
    });
    const found = edges.filter((value) => Number.isFinite(value)).length;
    let moved = 0;
    if (found >= zenConfig.edgeMinShare * columns.length) {
      // Median then moving average of the per-column edge. Columns without an edge keep the mask top.
      const half = Math.max(1, Math.round(zenConfig.edgeSmooth * sw));
      const med = edges.map((_, index) => {
        const near = edges.slice(Math.max(0, index - half), index + half + 1).filter((value) => Number.isFinite(value));
        return near.length > half ? median(near) : NaN;
      });
      const filled = med.map((value, index) => (Number.isFinite(value) ? value : tops[index]!));
      const smooth = filled.map((_, index) => {
        const near = filled.slice(Math.max(0, index - half), index + half + 1);
        return near.reduce((sum, value) => sum + value, 0) / near.length;
      });
      columns.forEach((x, index) => {
        const top = tops[index]!;
        if (top < 0) return;
        const cut = Math.min(Math.round(Math.min(smooth[index]!, top + maxDrop)), height);
        if (cut <= top) return;
        for (let y = top; y < cut; y += 1) grid[y * width + x] = 0;
        moved += 1;
      });
    }
    if (side < 0) done.left = moved;
    else done.right = moved;
  }
  return done;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Where the Step 2 "Shoulders level" dots go: ON the traced outline's shoulder top, not on the pose
 * landmarks (those sit low on the upper chest). For each side, the outline's top edge at the column
 * shoulderDotAt of the way from the neck to the shoulder landmark. Normalized, unmirrored, like the outline.
 */
export function shoulderTopsOnOutline(points: readonly NormPoint[] | null, frame: Landmarks | null): { left: NormPoint; right: NormPoint } | null {
  if (!points || points.length < 3 || !frame || !frame.leftShoulder || !frame.rightShoulder || !(frame.videoWidth > 0) || !(frame.videoHeight > 0)) return null;
  const vw = frame.videoWidth;
  const vh = frame.videoHeight;
  const box = frame.faceBox;
  const lsx = frame.leftShoulder.x / vw;
  const rsx = frame.rightShoulder.x / vw;
  const neckX = box && box.w > 0 ? box.x + box.w / 2 : (lsx + rsx) / 2;
  const sy = (frame.leftShoulder.y + frame.rightShoulder.y) / 2 / vh;
  const sw = Math.hypot(frame.rightShoulder.x - frame.leftShoulder.x, frame.rightShoulder.y - frame.leftShoulder.y);
  // Shoulder band (normalized y): from the face middle down to a bit below the shoulder landmarks.
  // A crossing at the frame top or bottom is never a shoulder.
  const bandTop = box && box.h > 0 ? box.y + box.h / 2 : sy - (zenConfig.dotBandAbove * sw) / vh;
  const bandBottom = Math.min(0.995, sy + (zenConfig.dotBandBelow * sw) / vh);
  // The outline's horizontal span inside the band: the dots stay inside it.
  let minX = Infinity;
  let maxX = -Infinity;
  for (const point of points) {
    if (point.y < bandTop || point.y > bandBottom) continue;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
  }
  if (!Number.isFinite(minX) || maxX - minX <= 0) return null;
  const margin = (maxX - minX) * 0.04;
  const at = (shoulderX: number, landmarkY: number): NormPoint | null => {
    const x = Math.min(maxX - margin, Math.max(minX + margin, neckX + zenConfig.shoulderDotAt * (shoulderX - neckX)));
    let top = Infinity;
    for (let index = 0; index < points.length; index += 1) {
      const a = points[index]!;
      const b = points[(index + 1) % points.length]!;
      if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
      const y = a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
      if (y >= bandTop && y <= bandBottom && y < top) top = y;
    }
    return Number.isFinite(top) ? { x, y: top } : Number.isFinite(landmarkY) ? { x, y: landmarkY } : null;
  };
  const left = at(lsx, frame.leftShoulder.y / vh);
  const right = at(rsx, frame.rightShoulder.y / vh);
  if (!left || !right) return null;
  // Never a vertical (or crossed) pair: the dots must sit on opposite sides of the neck, well apart.
  if (Math.abs(right.x - left.x) < (zenConfig.dotMinApart * sw) / vw || (left.x - neckX) * (lsx - neckX) <= 0 || (right.x - neckX) * (rsx - neckX) <= 0) return null;
  // A bad edge on one side (a chair) would tilt the dots. If the outline's tilt disagrees with the
  // landmark tilt by more than dotTiltTol of the frame, keep the LOWER dot (a chair only ever raises
  // a side) and set the other from the landmark tilt.
  // The camera frame can be mirrored (the "right" shoulder at the smaller x): keep the sign of dx.
  // Math.max(1, dx) here used to turn a negative dx into 1, so the slope blew up to the full height
  // difference per pixel and one dot was thrown off the frame (the vertical "Shoulders level" line).
  const run = frame.rightShoulder.x - frame.leftShoulder.x;
  const slope = Math.abs(run) >= 1 ? (frame.rightShoulder.y - frame.leftShoulder.y) / run : 0;
  const expected = (slope * (right.x - left.x) * vw) / vh;
  if (Math.abs(right.y - left.y - expected) > zenConfig.dotTiltTol) {
    if (left.y >= right.y) right.y = left.y + expected;
    else left.y = right.y - expected;
  }
  return { left, right };
}

/**
 * Measured neck-to-shoulder profile (multiclass snapshot only). The multiclass model can label a dark
 * chair back right behind the shoulders as clothes with the same confidence as the shirt, so the mask
 * alone cannot cut it. Hand-labelled real snapshots put the top of the shoulders, relative to the chin
 * and in shoulder widths, no higher than zenConfig.multiclass.profile (x = distance from the head
 * centre, y = height below the chin); the limit is that curve minus profileSlack. Linear between the
 * table points, flat beyond the last one (the loose guard owns the shoulder cap and the arms).
 */
function shoulderProfile(body: Body): (px: number) => number {
  const table = zenConfig.multiclass.profile;
  const { cx, chin } = body.head;
  const sw = body.sw;
  const slack = zenConfig.multiclass.profileSlack;
  return (px: number) => {
    const d = Math.abs(px - cx) / sw;
    const first = table[0]!;
    if (d <= first[0]) return -Infinity;
    let g = table[table.length - 1]![1];
    for (let index = 1; index < table.length; index += 1) {
      const [d1, g1] = table[index]!;
      if (d > d1) continue;
      const [d0, g0] = table[index - 1]!;
      g = g0 + ((g1 - g0) * (d - d0)) / (d1 - d0);
      break;
    }
    return chin + (g - slack) * sw;
  };
}

/** Sanity-only head limits for a clean multiclass mask: much wider and taller than the face box. */
function loosenHead(body: Body): Body {
  const { head } = body;
  const fh = head.chin - (head.cy - (head.chin - head.cy));
  const faceTop = head.chin - fh;
  return {
    ...body,
    head: { ...head, rx: head.rx * zenConfig.multiclass.headLoose, top: Math.min(head.top, faceTop - fh * zenConfig.multiclass.hairLoose) },
    profile: true,
  };
}

function clampToBody(grid: Uint8Array, values: Float32Array, width: number, height: number, body: Body): void {
  const arm = body.armMargin ?? zenConfig.armMargin;
  const left = Math.min(body.leftX, body.rightX) - arm * body.sw;
  const right = Math.max(body.leftX, body.rightX) + arm * body.sw;
  const bottom = Math.min(height, body.shoulderY + zenConfig.torsoDepth * body.sw);
  const { cx, cy, rx, top, faceHalf } = body.head;
  const sy = body.shoulderY;
  const chin = Math.min(body.head.chin, sy - 0.1 * body.sw);
  // Rounded dome: its apex sits on the mask's own crown (never above top), so a flat or frame-cut
  // hair top still gets round corners from the ellipse instead of square ones.
  let crown = top;
  for (let y = Math.max(0, Math.ceil(top)); y < Math.min(height, cy); y += 1) {
    let hit = false;
    for (let x = Math.max(0, Math.floor(cx - rx * 0.5)); x < Math.min(width, Math.ceil(cx + rx * 0.5)); x += 1) {
      if (grid[y * width + x]) {
        hit = true;
        break;
      }
    }
    if (hit) {
      crown = Math.max(top, y);
      break;
    }
  }
  const ryTop = Math.max(1, cy - crown);
  const shape = zenConfig.domeShape;
  const neckHalf = faceHalf * zenConfig.neckWiden;
  const leftSX = Math.min(body.leftX, body.rightX);
  const rightSX = Math.max(body.leftX, body.rightX);
  const dome = (py: number) => {
    if (py < crown) return -1;
    if (py < cy) {
      const t = Math.min(1, (cy - py) / ryTop);
      return rx * Math.pow(Math.max(0, 1 - Math.pow(t, shape)), 1 / shape);
    }
    // Jaw: taper from the full head width at the face middle into the neck at the chin, so the
    // jaw-to-neck join has no step for the corner rounding to fill (that read as a flare).
    if (py < chin) {
      const t = Math.min(1, (py - cy) / Math.max(1, chin - cy));
      return neckHalf + (rx - neckHalf) * Math.sqrt(Math.max(0, 1 - Math.pow(t, zenConfig.jawTaper)));
    }
    return neckHalf;
  };
  const looseGuard = shoulderGuard(body);
  const profile = body.profile ? shoulderProfile(body) : null;
  const guardTop = profile ? (px: number) => Math.max(looseGuard(px), profile(px)) : looseGuard;
  const profileFrom = body.head.chin - 2 * (body.head.chin - body.head.cy) * zenConfig.multiclass.profileFromFace;
  let topTouched = false;
  for (let y = 0; y < height; y += 1) {
    const py = y + 0.5;
    const row = y * width;
    if (py >= bottom) {
      grid.fill(0, row, row + width);
      continue;
    }
    const half = dome(py);
    for (let x = 0; x < width; x += 1) {
      const index = row + x;
      if (!grid[index]) continue;
      const px = x + 0.5;
      if (px < left || px > right) {
        grid[index] = 0;
        continue;
      }
      // Below the ear lobes the measured shoulder profile also limits the jaw sides (a chair right
      // beside the jaw sits inside the loose head dome).
      if (profile && py >= profileFrom && py < profile(px)) {
        grid[index] = 0;
        continue;
      }
      const inHead = half >= 0 && Math.abs(px - cx) <= half;
      if (inHead) {
        if (y === 0) topTouched = true;
        continue;
      }
      if (py < guardTop(px)) {
        grid[index] = 0;
        continue;
      }
      if (py >= sy) {
        // Shoulder caps, just past each shoulder point: a dark chair edge here is unsure too.
        const outside = px < leftSX || px > rightSX;
        if (outside && py < sy + zenConfig.capBand * body.sw && (values[index] ?? 0) < zenConfig.bandThreshold) grid[index] = 0;
        continue;
      }
      if ((values[index] ?? 0) < zenConfig.bandThreshold) grid[index] = 0;
    }
  }
  if (!topTouched) return;
  // Hair cut by the frame top: only bridge gaps INSIDE the mask's own span on each row (never paint
  // the whole dome, which drew a helmet far outside the hair); the rounding does the corners.
  for (let y = 0; y < Math.min(height, Math.ceil(cy)); y += 1) {
    const half = dome(y + 0.5);
    if (half < 0) continue;
    const row = y * width;
    let first = -1;
    let last = -1;
    for (let x = Math.max(0, Math.floor(cx - half)); x < Math.min(width, Math.ceil(cx + half)); x += 1) {
      if (!grid[row + x]) continue;
      if (first < 0) first = x;
      last = x;
    }
    if (first >= 0) grid.fill(1, row + first, row + last + 1);
  }
}

/**
 * Pose sanity check per shoulder. The outer shoulder edge must sit outside its landmark, and the
 * arm must not run along the chair clamp (mask bled into a dark chair). If either fails, that side
 * is redrawn from a landmark-guided curve: neck base, trapezius, shoulder cap, upper-arm edge.
 */
export function guideShoulders(grid: Uint8Array, width: number, height: number, body: Body): { left: boolean; right: boolean } {
  const midX = (body.leftX + body.rightX) / 2;
  const sw = body.sw;
  const bottom = Math.min(height, body.shoulderY + zenConfig.torsoDepth * sw);
  const result = { left: false, right: false };
  for (const side of [-1, 1] as const) {
    const sx = side < 0 ? Math.min(body.leftX, body.rightX) : Math.max(body.leftX, body.rightX);
    const limit = sx + side * (body.armMargin ?? zenConfig.armMargin) * sw;
    const needed = sx + side * 0.05 * sw;
    let reaches = false;
    let atLimit = 0;
    let rows = 0;
    const capTop = Math.max(0, Math.floor(body.shoulderY - 0.05 * sw));
    const capBottom = Math.min(height, Math.ceil(body.shoulderY + 0.15 * sw));
    const armBottom = Math.min(height, Math.ceil(body.shoulderY + 0.8 * sw), Math.floor(bottom));
    for (let y = capTop; y < armBottom; y += 1) {
      const outer = outerX(grid, width, y, midX, side);
      if (outer === null) continue;
      if (y < capBottom && side * (outer - needed) >= 0) reaches = true;
      if (y >= Math.floor(body.shoulderY)) {
        rows += 1;
        if (Math.abs(outer - limit) <= 1.5) atLimit += 1;
      }
    }
    const bled = rows > 0 && atLimit / rows > 0.6;
    if (reaches && !bled) continue;
    if (side < 0) result.left = true;
    else result.right = true;
    paintShoulder(grid, width, height, body, side, sx, bottom);
  }
  return result;
}

/** Outermost person pixel edge on one side of the body midline, or null. */
function outerX(grid: Uint8Array, width: number, y: number, midX: number, side: -1 | 1): number | null {
  const row = y * width;
  if (side < 0) {
    for (let x = 0; x < Math.min(width, Math.ceil(midX)); x += 1) if (grid[row + x]) return x;
  } else {
    for (let x = width - 1; x >= Math.max(0, Math.floor(midX)); x -= 1) if (grid[row + x]) return x + 1;
  }
  return null;
}

/** Replace one shoulder side (from the neck base down) with the landmark-guided shape. */
function paintShoulder(grid: Uint8Array, width: number, height: number, body: Body, side: -1 | 1, sx: number, bottom: number): void {
  const sw = body.sw;
  const midX = (body.leftX + body.rightX) / 2;
  const sy = body.shoulderY;
  const chin = Math.min(body.head.chin, sy - 0.1 * sw);
  const neck = { x: body.head.cx + side * body.head.faceHalf * zenConfig.neckWiden, y: chin };
  const cap = { x: sx + side * 0.18 * sw, y: sy - 0.06 * sw };
  const control = { x: neck.x + side * 0.08 * sw, y: cap.y - 0.02 * sw };
  const outline: Point[] = [{ x: midX, y: neck.y }];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    const u = 1 - t;
    outline.push({ x: u * u * neck.x + 2 * u * t * control.x + t * t * cap.x, y: u * u * neck.y + 2 * u * t * control.y + t * t * cap.y });
  }
  outline.push({ x: sx + side * 0.23 * sw, y: sy + 0.08 * sw });
  outline.push({ x: sx + side * 0.25 * sw, y: sy + 0.3 * sw });
  outline.push({ x: sx + side * 0.27 * sw, y: bottom });
  outline.push({ x: midX, y: bottom });
  const y0 = Math.max(0, Math.floor(neck.y));
  const y1 = Math.min(height, Math.ceil(bottom));
  for (let y = y0; y < y1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      if (side * (px - midX) < 0) continue;
      const inside = insidePolygon(outline, px, y + 0.5);
      // Keep the real neck and head column above the cap; the guided shape owns the rest of this side.
      if (inside) grid[y * width + x] = 1;
      else if (y + 0.5 > cap.y || Math.abs(px - body.head.cx) > body.head.rx) grid[y * width + x] = 0;
    }
  }
}

function insidePolygon(points: readonly Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i]!;
    const b = points[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** Morphological open then close with disk radii (in grid px), frame edges replicated. */
export function softenShape(grid: Uint8Array, width: number, height: number, openR: number, closeR: number): void {
  const pad = Math.ceil(Math.max(openR, closeR)) + 2;
  const pw = width + 2 * pad;
  const ph = height + 2 * pad;
  let work: Uint8Array = new Uint8Array(pw * ph);
  for (let y = 0; y < ph; y += 1) {
    const sy = Math.min(height - 1, Math.max(0, y - pad));
    for (let x = 0; x < pw; x += 1) {
      const sx = Math.min(width - 1, Math.max(0, x - pad));
      work[y * pw + x] = grid[sy * width + sx] ?? 0;
    }
  }
  if (openR >= 1) work = dilate(erode(work, pw, ph, openR), pw, ph, openR);
  if (closeR >= 1) work = erode(dilate(work, pw, ph, closeR), pw, ph, closeR);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) grid[y * width + x] = work[(y + pad) * pw + x + pad] ?? 0;
  }
}

function erode(grid: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const toBackground = squaredDistance(grid, width, height, 0);
  const out = new Uint8Array(grid.length);
  const limit = radius * radius;
  for (let index = 0; index < grid.length; index += 1) out[index] = grid[index] && (toBackground[index] ?? 0) > limit ? 1 : 0;
  return out;
}

function dilate(grid: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const toPerson = squaredDistance(grid, width, height, 1);
  const out = new Uint8Array(grid.length);
  const limit = radius * radius;
  for (let index = 0; index < grid.length; index += 1) out[index] = (toPerson[index] ?? Infinity) <= limit ? 1 : 0;
  return out;
}

/** Exact squared Euclidean distance to the nearest pixel equal to `target` (Felzenszwalb-Huttenlocher). */
function squaredDistance(grid: Uint8Array, width: number, height: number, target: 0 | 1): Float64Array {
  const big = 1e20;
  const field = new Float64Array(width * height);
  for (let index = 0; index < field.length; index += 1) field[index] = grid[index] === target ? 0 : big;
  const size = Math.max(width, height);
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  const pass = (n: number) => {
    let k = 0;
    v[0] = 0;
    z[0] = -Infinity;
    z[1] = Infinity;
    for (let q = 1; q < n; q += 1) {
      let s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      while (s <= z[k]!) {
        k -= 1;
        s = ((f[q]! + q * q) - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
      }
      k += 1;
      v[k] = q;
      z[k] = s;
      z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q += 1) {
      while (z[k + 1]! < q) k += 1;
      const dq = q - v[k]!;
      d[q] = dq * dq + f[v[k]!]!;
    }
  };
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) f[y] = field[y * width + x]!;
    pass(height);
    for (let y = 0; y < height; y += 1) field[y * width + x] = d[y]!;
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) f[x] = field[y * width + x]!;
    pass(width);
    for (let x = 0; x < width; x += 1) field[y * width + x] = d[x]!;
  }
  return field;
}

function thresholdGrid(values: Float32Array, threshold: number): Uint8Array {
  const grid = new Uint8Array(values.length);
  for (let index = 0; index < values.length; index += 1) grid[index] = (values[index] ?? 0) >= threshold ? 1 : 0;
  return grid;
}

/** 4-connected component that holds (or is next to) the seed. */
function componentAt(grid: Uint8Array, width: number, height: number, x: number, y: number): Uint8Array | null {
  const seed = snap(grid, width, height, x, y, Math.max(3, Math.round(width * 0.01)));
  if (!seed) return null;
  const start = seed.y * width + seed.x;
  const seen = new Uint8Array(grid.length);
  const stack = [start];
  seen[start] = 1;
  while (stack.length > 0) {
    const current = stack.pop() ?? 0;
    const px = current % width;
    const py = (current - px) / width;
    if (px > 0 && grid[current - 1] && !seen[current - 1]) { seen[current - 1] = 1; stack.push(current - 1); }
    if (px < width - 1 && grid[current + 1] && !seen[current + 1]) { seen[current + 1] = 1; stack.push(current + 1); }
    if (py > 0 && grid[current - width] && !seen[current - width]) { seen[current - width] = 1; stack.push(current - width); }
    if (py < height - 1 && grid[current + width] && !seen[current + width]) { seen[current + width] = 1; stack.push(current + width); }
  }
  return seen;
}

function snap(grid: Uint8Array, width: number, height: number, x: number, y: number, reach: number): { x: number; y: number } | null {
  const originX = Math.floor(x);
  const originY = Math.floor(y);
  let best: { x: number; y: number } | null = null;
  let bestDistance = Infinity;
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const nx = originX + dx;
      const ny = originY + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || !grid[ny * width + nx]) continue;
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: nx, y: ny };
      }
    }
  }
  return best;
}

/** Background pockets fully inside the person become person, so only the outer edge is traced. */
function fillHoles(grid: Uint8Array, width: number, height: number): void {
  const outside = new Uint8Array(grid.length);
  const stack: number[] = [];
  const push = (index: number) => {
    if (grid[index] || outside[index]) return;
    outside[index] = 1;
    stack.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width);
    push(y * width + width - 1);
  }
  while (stack.length > 0) {
    const current = stack.pop() ?? 0;
    const px = current % width;
    const py = (current - px) / width;
    if (px > 0) push(current - 1);
    if (px < width - 1) push(current + 1);
    if (py > 0) push(current - width);
    if (py < height - 1) push(current + width);
  }
  for (let index = 0; index < grid.length; index += 1) if (!outside[index]) grid[index] = 1;
}

function touchesSide(grid: Uint8Array, width: number, rows: number): boolean {
  const height = rows;
  const limit = Math.max(1, Math.floor(width * zenConfig.edgeTouch));
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < limit; x += 1) if (grid[row + x] || grid[row + width - 1 - x]) return true;
  }
  return false;
}

/** Only the head and shoulder caps count; upper arms may run off the sides near the bottom. */
function outlineTouchesEdge(points: readonly NormPoint[], belowY: number): boolean {
  return points.some((point) => point.y <= belowY && (point.x <= zenConfig.edgeTouch || point.x >= 1 - zenConfig.edgeTouch));
}

/** Small circular moving average on the dense contour. A few pixels at most, so no visible shrink. */
function smoothClosed(points: readonly Point[], window: number, passes: number): Point[] {
  let current = points.map((point) => ({ x: point.x, y: point.y }));
  const half = Math.floor(window / 2);
  const count = current.length;
  for (let pass = 0; pass < passes; pass += 1) {
    const source = current;
    current = source.map((_, index) => {
      let x = 0;
      let y = 0;
      for (let offset = -half; offset <= half; offset += 1) {
        const point = source[(index + offset + count) % count] ?? source[0]!;
        x += point.x;
        y += point.y;
      }
      return { x: x / (2 * half + 1), y: y / (2 * half + 1) };
    });
  }
  return current;
}

/**
 * Extra smoothing for the upper-arm edges only. Points below the shoulder line blend toward a wide
 * moving average (fully from armSmoothStart shoulder widths down), so mask stair-steps on the arms go
 * away while the head, ears and neck keep the light smoothing. The flat bottom stays put.
 */
function smoothArms(points: readonly Point[], shoulderY: number, sw: number, bottom: number): Point[] {
  const count = points.length;
  if (count < 8) return points.map((point) => ({ ...point }));
  const ramp = Math.max(1, zenConfig.armSmoothStart * sw);
  const weight = points.map((point) => (point.y >= bottom - 1 ? 0 : Math.min(1, Math.max(0, (point.y - shoulderY) / ramp))));
  if (weight.every((w) => w === 0)) return points.map((point) => ({ ...point }));
  const half = Math.floor(zenConfig.armSmoothWindow / 2);
  let current = points.map((point) => ({ x: point.x, y: point.y }));
  for (let pass = 0; pass < zenConfig.armSmoothPasses; pass += 1) {
    const source = current;
    current = source.map((point, index) => {
      const w = weight[index] ?? 0;
      if (w === 0) return point;
      let x = 0;
      let y = 0;
      for (let offset = -half; offset <= half; offset += 1) {
        const other = source[(index + offset + count) % count] ?? point;
        x += other.x;
        y += other.y;
      }
      const n = 2 * half + 1;
      return { x: point.x + (x / n - point.x) * w, y: point.y + (y / n - point.y) * w };
    });
  }
  return current;
}

function areaOk(points: readonly Point[], width: number, height: number): boolean {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index] ?? points[0]!;
    const following = points[(index + 1) % points.length] ?? current;
    sum += current.x * following.y - following.x * current.y;
  }
  const share = Math.abs(sum / 2) / Math.max(1, width * height);
  return share >= zenConfig.area.min && share <= zenConfig.area.max;
}

function headAbove(points: readonly Point[], shoulderY: number): boolean {
  let minY = Infinity;
  for (const point of points) minY = Math.min(minY, point.y);
  return minY < shoulderY;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Head zone: the face box a little wider, from well above the forehead down to the chin (grid px). */
function headZone(body: Body): { x0: number; x1: number; y0: number; y1: number } {
  const { cx, cy, chin, faceHalf } = body.head;
  const fh = 2 * (chin - cy);
  const half = faceHalf * zenConfig.multiclass.headZoneWiden;
  return { x0: cx - half, x1: cx + half, y0: chin - fh * (1 + zenConfig.multiclass.headZoneRise), y1: chin };
}

/** values -= clothes beside the face (outside the face box width) above chin - clothesAboveChin x shoulder width. */
function dropClothesBesideHead(values: Float32Array, clothes: Float32Array, width: number, height: number, body: Body): void {
  const { cx, chin, faceHalf } = body.head;
  const y1 = Math.min(height, Math.ceil(chin - zenConfig.multiclass.clothesAboveChin * body.sw));
  const half = faceHalf * zenConfig.multiclass.clothesBesideFace;
  for (let y = 0; y < y1; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (Math.abs(x + 0.5 - cx) <= half) continue;
      const index = y * width + x;
      values[index] = Math.max(0, (values[index] ?? 0) - (clothes[index] ?? 0));
    }
  }
}

/** values += extra (clamped to 1) inside the head zone only. */
function addInHeadZone(values: Float32Array, extra: Float32Array, width: number, height: number, body: Body): void {
  const zone = headZone(body);
  for (let y = Math.max(0, Math.floor(zone.y0)); y < Math.min(height, Math.ceil(zone.y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(zone.x0)); x < Math.min(width, Math.ceil(zone.x1)); x += 1) {
      const index = y * width + x;
      values[index] = Math.min(1, (values[index] ?? 0) + (extra[index] ?? 0));
    }
  }
}

function thresholdHeadZone(values: Float32Array, width: number, height: number, body: Body, threshold: number, headThreshold: number): Uint8Array {
  const grid = thresholdGrid(values, threshold);
  const zone = headZone(body);
  for (let y = Math.max(0, Math.floor(zone.y0)); y < Math.min(height, Math.ceil(zone.y1)); y += 1) {
    for (let x = Math.max(0, Math.floor(zone.x0)); x < Math.min(width, Math.ceil(zone.x1)); x += 1) {
      const index = y * width + x;
      if ((values[index] ?? 0) >= headThreshold) grid[index] = 1;
    }
  }
  return grid;
}

/**
 * The 4-connected piece with the largest overlap with the face (face box width, forehead to chin).
 * Falls back to the piece at the nose when nothing overlaps.
 */
function bodyComponent(grid: Uint8Array, width: number, height: number, body: Body): Uint8Array | null {
  const { cx, cy, chin, faceHalf } = body.head;
  const x0 = Math.max(0, Math.floor(cx - faceHalf));
  const x1 = Math.min(width, Math.ceil(cx + faceHalf));
  const y0 = Math.max(0, Math.floor(chin - 2 * (chin - cy)));
  const y1 = Math.min(height, Math.ceil(chin));
  const label = new Int32Array(grid.length);
  let best = 0;
  let bestCount = 0;
  let next = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const start = y * width + x;
      if (!grid[start] || label[start]) continue;
      next += 1;
      label[start] = next;
      const stack = [start];
      let count = 0;
      while (stack.length > 0) {
        const current = stack.pop() ?? 0;
        const px = current % width;
        const py = (current - px) / width;
        if (px >= x0 && px < x1 && py >= y0 && py < y1) count += 1;
        if (px > 0 && grid[current - 1] && !label[current - 1]) { label[current - 1] = next; stack.push(current - 1); }
        if (px < width - 1 && grid[current + 1] && !label[current + 1]) { label[current + 1] = next; stack.push(current + 1); }
        if (py > 0 && grid[current - width] && !label[current - width]) { label[current - width] = next; stack.push(current - width); }
        if (py < height - 1 && grid[current + width] && !label[current + width]) { label[current + width] = next; stack.push(current + width); }
      }
      if (count > bestCount) {
        bestCount = count;
        best = next;
      }
    }
  }
  if (!best) return componentAt(grid, width, height, body.noseX, body.noseY);
  const out = new Uint8Array(grid.length);
  for (let index = 0; index < grid.length; index += 1) if (label[index] === best) out[index] = 1;
  return out;
}

/** The outline's top over the face column must be above the eyes (or the upper face when eyes are unknown). */
function headCovered(points: readonly Point[], body: Body, frame: Landmarks, scale: number): boolean {
  const { cx, cy, chin, faceHalf } = body.head;
  const fh = 2 * (chin - cy);
  const eyes = [frame.leftEye, frame.rightEye].filter((eye): eye is NonNullable<typeof eye> => !!eye).map((eye) => eye.y * scale);
  const eyeLine = eyes.length > 0 ? Math.min(...eyes) : chin - fh * 0.62;
  let top = Infinity;
  for (const point of points) {
    if (Math.abs(point.x * scale - cx) <= faceHalf * 0.5) top = Math.min(top, point.y * scale);
  }
  return top <= eyeLine;
}
