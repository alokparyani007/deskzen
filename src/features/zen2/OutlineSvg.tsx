import { useEffect, useId, useState } from 'react';
import { arrowHead, curveArrow } from '../live/outline';
import { videoToScreen } from '../../lib/vision/toScreen';
import type { NormPoint } from '../../lib/posture/types';

export function useStageBox(): { ref: (node: HTMLDivElement | null) => void; width: number; height: number } {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 1, height: 1 });
  useEffect(() => {
    if (!node) return;
    const update = () => setBox({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { ref: setNode, width: box.width, height: box.height };
}

/** Draws saved and live outlines. Points stay unmirrored; videoToScreen mirrors them. */
export function OutlineSvg({
  saved,
  live,
  videoWidth,
  videoHeight,
  viewWidth,
  viewHeight,
  amber,
  arrow,
  dots,
  dim,
  fill,
  marks,
  bottomInset,
}: {
  saved: readonly NormPoint[] | null;
  live?: readonly NormPoint[] | null;
  videoWidth: number;
  videoHeight: number;
  viewWidth: number;
  viewHeight: number;
  amber?: boolean;
  arrow?: { from: NormPoint; to: NormPoint } | null;
  dots?: readonly NormPoint[];
  /** Dim everything outside the saved outline (Step 2 picture). */
  dim?: boolean;
  /** Faint mint fill inside the saved outline (Step 4). */
  fill?: boolean;
  /** Step 2 markers: shoulder landmark dots joined by a dashed "Shoulders level" line, and a chin dot. */
  marks?: OutlineMarks | null;
  /** Px above the stage bottom where the loop is closed; at least bottomInsetFor(viewHeight). */
  bottomInset?: number;
}) {
  const rawId = useId();
  const maskId = `drift${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const glowId = `glow${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // ONE closed loop shaped for the stage: clipped at the bottom inset with a straight, visible bottom
  // edge and rounded corners, kept inside the sides and top, with loops and cusps removed. The same path
  // drives the dim, the fill, the glow and the line.
  const savedScreen = closedOutline((saved ?? []).map((point) => place(point, videoWidth, videoHeight, viewWidth, viewHeight)), viewWidth, viewHeight, bottomInset);
  const savedClosed = outlinePath(savedScreen);
  const liveScreen = (live ?? []).map((point) => place(point, videoWidth, videoHeight, viewWidth, viewHeight));
  const arrowPath = arrow
    ? curveArrow(place(arrow.from, videoWidth, videoHeight, viewWidth, viewHeight), place(arrow.to, videoWidth, videoHeight, viewWidth, viewHeight))
    : '';
  const head = arrow
    ? arrowHead(place(arrow.from, videoWidth, videoHeight, viewWidth, viewHeight), place(arrow.to, videoWidth, videoHeight, viewWidth, viewHeight))
    : '';
  const tint = amber && liveScreen.length > 2 && savedScreen.length > 2;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${viewWidth} ${viewHeight}`} aria-hidden="true">
      <defs>
        {/* Filter region in stage pixels, much larger than the loop, so the glow is never cut (head top). */}
        <filter id={glowId} filterUnits="userSpaceOnUse" x={-0.2 * viewWidth} y={-0.2 * viewHeight} width={1.4 * viewWidth} height={1.4 * viewHeight}>
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>
      {dim && savedScreen.length > 2 ? (
        <path d={`M 0 0 H ${viewWidth} V ${viewHeight} H 0 Z ${savedClosed}`} fillRule="evenodd" fill="black" fillOpacity="0.25" />
      ) : null}
      {tint ? (
        <>
          <mask id={maskId}>
            <path d={pathOf(liveScreen)} fill="white" />
            <path d={savedClosed} fill="black" />
          </mask>
          <rect x="0" y="0" width={viewWidth} height={viewHeight} fill="var(--color-glow)" fillOpacity="0.42" mask={`url(#${maskId})`} />
        </>
      ) : null}
      {fill && savedScreen.length > 2 ? <path d={savedClosed} fill="var(--color-outline)" fillOpacity="0.07" stroke="none" /> : null}
      {savedScreen.length > 2 ? (
        <>
          {/* ONE closed loop, drawn after the dim and fill: an even 6 px emerald glow, a faint dark
              under-stroke so the line has the same contrast over a light wall and a dark shirt, then the
              solid 2 px line on top. */}
          <path data-outline="glow" d={savedClosed} fill="none" stroke="var(--color-outline)" strokeOpacity="0.6" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" filter={`url(#${glowId})`} />
          <path data-outline="under" d={savedClosed} fill="none" stroke="black" strokeOpacity="0.35" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <path data-outline="line" d={savedClosed} fill="none" stroke="var(--color-print)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" shapeRendering="geometricPrecision" />
        </>
      ) : null}
      {marks ? <MarkLayer marks={marks} place={(at) => place(at, videoWidth, videoHeight, viewWidth, viewHeight)} /> : null}
      {arrowPath ? <path d={arrowPath} fill="none" stroke="var(--color-glow)" strokeWidth="4" strokeLinecap="round" /> : null}
      {head ? <path d={head} fill="none" stroke="var(--color-glow)" strokeWidth="4" strokeLinecap="round" /> : null}
      {dots?.map((dot, index) => {
        const at = place(dot, videoWidth, videoHeight, viewWidth, viewHeight);
        return <circle key={index} cx={at.x} cy={at.y} r="4" fill="var(--color-glow)" />;
      })}
    </svg>
  );
}

export interface OutlineMarks {
  left: NormPoint;
  right: NormPoint;
  chin?: NormPoint | null;
  label?: string;
  /** Amber when a shoulder has risen past the saved line. Emerald on the picture step. */
  tone?: 'good' | 'amber';
}

function MarkLayer({ marks, place: toView }: { marks: OutlineMarks; place: (point: NormPoint) => { x: number; y: number } }) {
  const a = toView(marks.left);
  const b = toView(marks.right);
  const leftmost = a.x <= b.x ? a : b;
  const chin = marks.chin ? toView(marks.chin) : null;
  const amber = marks.tone === 'amber';
  const line = amber ? 'var(--color-glow)' : 'var(--color-outline)';
  const dot = amber ? 'var(--color-glow)' : 'var(--color-print)';
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={line} strokeWidth="1.5" strokeDasharray="6 5" opacity="0.95" />
      {[a, b].map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="5.5" fill={dot} stroke="white" strokeWidth="1.5" />
      ))}
      <text x={leftmost.x + 18} y={Math.min(a.y, b.y) - 9} fill="white" fontSize="13" fontWeight="500" style={{ paintOrder: 'stroke', stroke: 'rgb(0 0 0 / 0.55)', strokeWidth: 3 }}>
        {marks.label ?? 'Shoulders level'}
      </text>
      {chin ? <circle cx={chin.x} cy={chin.y} r="4" fill="var(--color-print)" stroke="white" strokeWidth="1.5" /> : null}
    </g>
  );
}

export function place(point: NormPoint, videoWidth: number, videoHeight: number, viewWidth: number, viewHeight: number): { x: number; y: number } {
  return videoToScreen(point.x * videoWidth, point.y * videoHeight, videoWidth, videoHeight, viewWidth, viewHeight);
}

function pathOf(points: readonly { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')} Z`;
}

/** Pixels the saved outline is kept inside the stage: half the 6 px glow stroke, so nothing is clipped. */
export const OUTLINE_INSET = 3;

/** Clamp screen points into the view, `inset` px from every edge. */
export function insetToView(points: readonly { x: number; y: number }[], width: number, height: number, inset: number, bottom = inset): { x: number; y: number }[] {
  const x0 = Math.min(inset, width / 2);
  const y0 = Math.min(inset, height / 2);
  const y1 = Math.min(bottom, height / 2);
  return points.map((point) => ({ x: Math.min(width - x0, Math.max(x0, point.x)), y: Math.min(height - y1, Math.max(y0, point.y)) }));
}

const fx = (value: number) => value.toFixed(1);

/** Closed Catmull-Rom curve through every point. */
export function smoothClosedPath(points: readonly { x: number; y: number }[]): string {
  const count = points.length;
  if (count < 3) return '';
  // Control points are kept inside the points' bounding box, so the curve (inside the hull of its
  // control points) never overshoots past the inset edges at a sharp bottom corner and gets clipped.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const cx = (value: number) => fx(Math.min(maxX, Math.max(minX, value)));
  const cy = (value: number) => fx(Math.min(maxY, Math.max(minY, value)));
  let path = `M ${fx(points[0]!.x)} ${fx(points[0]!.y)}`;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count]!;
    const p1 = points[index]!;
    const p2 = points[(index + 1) % count]!;
    const p3 = points[(index + 2) % count]!;
    path += ` C ${cx(p1.x + (p2.x - p0.x) / 6)} ${cy(p1.y + (p2.y - p0.y) / 6)} ${cx(p2.x - (p3.x - p1.x) / 6)} ${cy(p2.y - (p3.y - p1.y) / 6)} ${fx(p2.x)} ${fx(p2.y)}`;
  }
  return `${path} Z`;
}


/** Clear space above the stage bottom for the closing edge: 14 px or 3% of the stage height, whichever is larger. */
export function bottomInsetFor(height: number): number {
  return Math.max(14, 0.03 * height);
}

/** Minimum gap between the outline and the stage top. */
export const OUTLINE_TOP_INSET = 6;
/** Radius of the two rounded bottom corners. */
export const BOTTOM_CORNER_RADIUS = 10;

export interface LoopPoint {
  x: number;
  y: number;
  /** Lies on the straight closing edge (drawn with straight segments). */
  edge?: boolean;
}

/**
 * The saved outline as one simple closed loop for a stage of width x height:
 * 1. kept OUTLINE_INSET px inside the sides and OUTLINE_TOP_INSET px below the top;
 * 2. clipped at y = height - bottomInset, so the arms end there and a straight edge joins them;
 * 3. near-duplicate points, self-intersections (tiny loops) and cusps (the line doubling back) removed;
 * 4. the two bottom corners rounded with BOTTOM_CORNER_RADIUS.
 */
export function closedOutline(points: readonly { x: number; y: number }[], width: number, height: number, bottomInset?: number): LoopPoint[] {
  if (points.length < 3 || !(width > 0) || !(height > 0)) return [];
  const bottom = height - Math.max(bottomInset ?? 0, bottomInsetFor(height));
  const x0 = Math.min(OUTLINE_INSET, width / 2);
  const x1 = width - x0;
  const top = Math.min(OUTLINE_TOP_INSET, bottom / 2);
  let loop: LoopPoint[] = points.map((p) => ({ x: Math.min(x1, Math.max(x0, p.x)), y: Math.max(top, p.y) }));
  loop = clipBelow(loop, bottom);
  loop = dedupe(loop, 0.75);
  loop = untangle(loop);
  loop = removeCusps(loop);
  if (loop.length < 3) return [];
  return roundBottomCorners(loop, BOTTOM_CORNER_RADIUS);
}

/** Sutherland-Hodgman clip of a closed polygon to y <= limit; points on the limit are flagged as edge. */
function clipBelow(points: readonly LoopPoint[], limit: number): LoopPoint[] {
  const out: LoopPoint[] = [];
  const n = points.length;
  for (let i = 0; i < n; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    const aIn = a.y <= limit;
    const bIn = b.y <= limit;
    if (aIn) out.push(a.y === limit ? { x: a.x, y: a.y, edge: true } : { x: a.x, y: a.y });
    if (aIn !== bIn) {
      const t = (limit - a.y) / (b.y - a.y);
      out.push({ x: a.x + (b.x - a.x) * t, y: limit, edge: true });
    }
  }
  return out;
}

function dedupe(points: readonly LoopPoint[], min: number): LoopPoint[] {
  const out: LoopPoint[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && Math.hypot(point.x - last.x, point.y - last.y) < min) {
      if (point.edge) last.edge = true;
      continue;
    }
    out.push({ ...point });
  }
  while (out.length > 3) {
    const first = out[0]!;
    const last = out[out.length - 1]!;
    if (Math.hypot(first.x - last.x, first.y - last.y) >= min) break;
    if (last.edge) first.edge = true;
    out.pop();
  }
  return out;
}

function crossAt(a: LoopPoint, b: LoopPoint, c: LoopPoint, d: LoopPoint): { x: number; y: number } | null {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
  const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
  if (t <= 1e-9 || t >= 1 - 1e-9 || u <= 1e-9 || u >= 1 - 1e-9) return null;
  return { x: a.x + rx * t, y: a.y + ry * t };
}

/** Cut out self-intersection loops, always keeping the longer part of the outline. */
function untangle(points: readonly LoopPoint[]): LoopPoint[] {
  let loop = [...points];
  for (let guard = 0; guard < 64; guard += 1) {
    const n = loop.length;
    if (n < 4) return loop;
    let hit: { i: number; j: number; at: { x: number; y: number } } | null = null;
    for (let i = 0; i < n && !hit; i += 1) {
      for (let j = i + 2; j < n; j += 1) {
        if (i === 0 && j === n - 1) continue;
        const at = crossAt(loop[i]!, loop[(i + 1) % n]!, loop[j]!, loop[(j + 1) % n]!);
        if (at) {
          hit = { i, j, at };
          break;
        }
      }
    }
    if (!hit) return loop;
    const { i, j, at } = hit;
    const inner = j - i;
    const join = { x: at.x, y: at.y, edge: Boolean(loop[i]!.edge && loop[(j + 1) % n]!.edge) };
    // inner = points i+1..j form one loop; the rest the other. Drop the shorter one.
    loop = inner <= n - inner ? [...loop.slice(0, i + 1), join, ...loop.slice(j + 1)] : [join, ...loop.slice(i + 1, j + 1)];
  }
  return loop;
}

/** Drop points where the line turns back on itself (a turn sharper than 150 degrees). */
function removeCusps(points: readonly LoopPoint[]): LoopPoint[] {
  let loop = [...points];
  for (let pass = 0; pass < 8; pass += 1) {
    const n = loop.length;
    if (n < 4) return loop;
    const keep = loop.filter((p, i) => {
      if (p.edge) return true;
      const a = loop[(i - 1 + n) % n]!;
      const b = loop[(i + 1) % n]!;
      const ux = p.x - a.x;
      const uy = p.y - a.y;
      const vx = b.x - p.x;
      const vy = b.y - p.y;
      const lu = Math.hypot(ux, uy);
      const lv = Math.hypot(vx, vy);
      if (lu === 0 || lv === 0) return false;
      return (ux * vx + uy * vy) / (lu * lv) > Math.cos((150 * Math.PI) / 180);
    });
    if (keep.length === n) return loop;
    loop = keep;
  }
  return loop;
}

/** Replace each corner where an arm meets the straight bottom edge with a short rounded arc. */
function roundBottomCorners(points: readonly LoopPoint[], radius: number): LoopPoint[] {
  const n = points.length;
  const out: LoopPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    const p = points[i]!;
    const prev = points[(i - 1 + n) % n]!;
    const next = points[(i + 1) % n]!;
    const corner = p.edge && (!prev.edge || !next.edge) && !(!prev.edge && !next.edge);
    if (!corner) {
      out.push(p);
      continue;
    }
    // Leg along the arm (to the non-edge neighbour) and leg along the bottom (to the edge neighbour).
    const legLength = (q: LoopPoint) => Math.hypot(q.x - p.x, q.y - p.y);
    const r = Math.min(radius, legLength(prev) * 0.5, legLength(next) * 0.5);
    if (!(r > 0.5)) {
      out.push(p);
      continue;
    }
    const from = { x: p.x + ((prev.x - p.x) / legLength(prev)) * r, y: p.y + ((prev.y - p.y) / legLength(prev)) * r, edge: Boolean(prev.edge) };
    const to = { x: p.x + ((next.x - p.x) / legLength(next)) * r, y: p.y + ((next.y - p.y) / legLength(next)) * r, edge: Boolean(next.edge) };
    // Quadratic arc from `from` to `to` with the corner as its control point.
    out.push(from);
    for (let k = 1; k < 6; k += 1) {
      const t = k / 6;
      const u = 1 - t;
      out.push({ x: u * u * from.x + 2 * u * t * p.x + t * t * to.x, y: u * u * from.y + 2 * u * t * p.y + t * t * to.y });
    }
    out.push(to);
  }
  return out;
}

/**
 * One closed SVG path for a closedOutline loop: Catmull-Rom through the points (control points kept
 * inside the loop's bounding box, so nothing overshoots the insets), straight segments along the
 * bottom edge. Ends in Z.
 */
export function outlinePath(points: readonly LoopPoint[]): string {
  const count = points.length;
  if (count < 3) return '';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const cx = (value: number) => fx(Math.min(maxX, Math.max(minX, value)));
  const cy = (value: number) => fx(Math.min(maxY, Math.max(minY, value)));
  let path = `M ${fx(points[0]!.x)} ${fx(points[0]!.y)}`;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count]!;
    const p1 = points[index]!;
    const p2 = points[(index + 1) % count]!;
    const p3 = points[(index + 2) % count]!;
    if (p1.edge && p2.edge) {
      path += ` L ${fx(p2.x)} ${fx(p2.y)}`;
      continue;
    }
    path += ` C ${cx(p1.x + (p2.x - p0.x) / 6)} ${cy(p1.y + (p2.y - p0.y) / 6)} ${cx(p2.x - (p3.x - p1.x) / 6)} ${cy(p2.y - (p3.y - p1.y) / 6)} ${fx(p2.x)} ${fx(p2.y)}`;
  }
  return `${path} Z`;
}
