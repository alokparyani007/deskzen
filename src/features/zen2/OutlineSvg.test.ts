import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NormPoint } from '../../lib/posture/types';
import { bottomInsetFor, closedOutline, insetToView, OUTLINE_INSET, OUTLINE_TOP_INSET, OutlineSvg, outlinePath } from './OutlineSvg';
import { OutlineStep } from './OutlineStep';
import { DoneStep } from './DoneStep';

/** A small person-ish closed outline, normalized, with a flat bottom at the frame edge. */
const outline: NormPoint[] = [
  { x: 0.5, y: 0.2 },
  { x: 0.56, y: 0.24 },
  { x: 0.57, y: 0.4 },
  { x: 0.54, y: 0.5 },
  { x: 0.68, y: 0.62 },
  { x: 0.72, y: 1 },
  { x: 0.28, y: 1 },
  { x: 0.32, y: 0.62 },
  { x: 0.46, y: 0.5 },
  { x: 0.43, y: 0.4 },
  { x: 0.44, y: 0.24 },
];

const base = { videoWidth: 1280, videoHeight: 720, viewWidth: 960, viewHeight: 540 };

describe('OutlineSvg render smoke test', () => {
  it('renders the saved outline with dim, fill and marks', () => {
    const html = renderToString(
      createElement(OutlineSvg, {
        ...base,
        saved: outline,
        dim: true,
        fill: true,
        marks: { left: { x: 0.36, y: 0.62 }, right: { x: 0.64, y: 0.62 }, chin: { x: 0.5, y: 0.45 } },
      }),
    );
    expect(html).toContain('<svg');
    expect(html).toContain('Shoulders level');
    expect(html).toMatch(/ C /);
  });

  it('draws the saved outline as ONE closed path (line and glow), never dashed', () => {
    const html = renderToString(createElement(OutlineSvg, { ...base, saved: outline, dim: true, fill: true }));
    for (const kind of ['line', 'glow']) {
      const paths = html.match(new RegExp(`<path[^>]*data-outline="${kind}"[^>]*>`, 'g')) ?? [];
      expect(paths).toHaveLength(1);
      const d = /\sd="([^"]+)"/.exec(paths[0]!)?.[1] ?? '';
      expect(d.trim().endsWith('Z')).toBe(true);
      expect(d.match(/M/g)).toHaveLength(1);
      expect(paths[0]).not.toMatch(/dasharray/i);
    }
  });

  it('keeps outline points inside the stage by the stroke inset, so the frame edge never cuts the line', () => {
    const inset = insetToView([{ x: -20, y: 600 }, { x: 480, y: 270 }, { x: 990, y: -5 }], 960, 540, OUTLINE_INSET);
    expect(inset).toEqual([{ x: OUTLINE_INSET, y: 540 - OUTLINE_INSET }, { x: 480, y: 270 }, { x: 960 - OUTLINE_INSET, y: OUTLINE_INSET }]);
  });

  it('renders live, amber, arrow and dots without throwing', () => {
    expect(() =>
      renderToString(
        createElement(OutlineSvg, {
          ...base,
          saved: outline,
          live: outline.map((point) => ({ x: point.x + 0.02, y: point.y })),
          amber: true,
          arrow: { from: { x: 0.5, y: 0.3 }, to: { x: 0.5, y: 0.25 } },
          dots: [{ x: 0.5, y: 0.5 }],
        }),
      ),
    ).not.toThrow();
  });

  it('renders with no outline at all', () => {
    expect(() => renderToString(createElement(OutlineSvg, { ...base, saved: null }))).not.toThrow();
    expect(() => renderToString(createElement(OutlineSvg, { ...base, saved: [] }))).not.toThrow();
  });

  it('renders the Step 2 and Done screens', () => {
    const canvas = { width: 1280, height: 720 } as unknown as HTMLCanvasElement;
    const capture = { canvas, width: 1280, height: 720, dispose: () => undefined };
    const step = renderToString(
      createElement(OutlineStep, { capture, outline, badges: [{ label: 'Head centered', pass: true }], marks: { left: { x: 0.36, y: 0.62 }, right: { x: 0.64, y: 0.62 } } }),
    );
    expect(step).toContain('Head centered');
    const done = renderToString(createElement(DoneStep, { outline, mode: 'sit' as const, video: { width: 1280, height: 720 } }));
    expect(done).toContain('Your Posture Print');
  });
});

/** Every x,y pair in a path string. */
function pairs(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

function segmentsCross(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): boolean {
  const o = (p: typeof a, q: typeof a, r: typeof a) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

describe('closed outline with a visible bottom edge', () => {
  const view = { w: 812, h: 410 };
  const html = renderToString(createElement(OutlineSvg, { ...base, viewWidth: view.w, viewHeight: view.h, saved: outline, dim: true, fill: true }));
  const pathOfKind = (kind: string) => /\sd="([^"]+)"/.exec((html.match(new RegExp(`<path[^>]*data-outline="${kind}"[^>]*>`)) ?? [''])[0])?.[1] ?? '';
  const d = pathOfKind('line');

  it('is one path ending in Z, shared by the glow, line, fill and dim', () => {
    expect(d.trim().endsWith('Z')).toBe(true);
    expect(d.match(/M/g)).toHaveLength(1);
    expect(pathOfKind('glow')).toBe(d);
    expect(html).toContain(`d="${d}" fill="var(--color-outline)"`);
    expect(html).toContain(`Z ${d}" fill-rule="evenodd"`);
  });

  it('stays 14 px (or 3%) above the stage bottom and 6 px below the top', () => {
    const ys = pairs(d).map((p) => p.y);
    expect(Math.max(...ys)).toBeLessThanOrEqual(view.h - 14 + 0.05);
    expect(Math.max(...ys)).toBeLessThanOrEqual(view.h - bottomInsetFor(view.h) + 0.05);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(OUTLINE_TOP_INSET - 0.05);
    expect(bottomInsetFor(1000)).toBe(30);
  });

  it('has a straight horizontal bottom run joining the two arms', () => {
    const cut = view.h - bottomInsetFor(view.h);
    const runs = [...d.matchAll(/L (-?\d+\.\d) (-?\d+\.\d)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const bottomRun = runs.filter((p) => Math.abs(p.y - cut) < 0.1);
    expect(bottomRun.length).toBeGreaterThanOrEqual(1);
    // The arms (outline x 0.28 and 0.72 at the bottom) sit well apart; the run spans most of that gap.
    const all = pairs(d).filter((p) => Math.abs(p.y - cut) < 0.1);
    const span = Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x));
    expect(span).toBeGreaterThan(view.w * 0.25);
  });

  it('rounds the two bottom corners (no point at the exact arm/edge corner)', () => {
    const loop = closedOutline([{ x: 100, y: 50 }, { x: 300, y: 50 }, { x: 300, y: 500 }, { x: 100, y: 500 }], 400, 400);
    const cut = 400 - 14;
    expect(loop.some((p) => p.x === 300 && p.y === cut)).toBe(false);
    expect(loop.some((p) => p.x > 290 && p.x < 300 && p.y > cut - 10 && p.y < cut)).toBe(true);
  });

  it('removes self-intersections and cusps, so the loop never crosses itself', () => {
    // A bow-tie twist and a spike that doubles back on itself.
    const messy = [
      { x: 100, y: 100 }, { x: 200, y: 100 }, { x: 205, y: 60 }, { x: 206, y: 110 }, { x: 300, y: 100 },
      { x: 300, y: 300 }, { x: 180, y: 300 }, { x: 220, y: 320 }, { x: 200, y: 280 }, { x: 100, y: 300 },
    ];
    const loop = closedOutline(messy, 400, 400);
    const n = loop.length;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 2; j < n; j += 1) {
        if (i === 0 && j === n - 1) continue;
        expect(segmentsCross(loop[i]!, loop[(i + 1) % n]!, loop[j]!, loop[(j + 1) % n]!)).toBe(false);
      }
    }
    for (let i = 0; i < n; i += 1) {
      const a = loop[(i - 1 + n) % n]!;
      const p = loop[i]!;
      const b = loop[(i + 1) % n]!;
      const cos = ((p.x - a.x) * (b.x - p.x) + (p.y - a.y) * (b.y - p.y)) / (Math.hypot(p.x - a.x, p.y - a.y) * Math.hypot(b.x - p.x, b.y - p.y));
      expect(cos).toBeGreaterThan(Math.cos((150 * Math.PI) / 180));
    }
    expect(outlinePath(loop).endsWith('Z')).toBe(true);
  });

  it('draws the 2 px line last of the outline layers, over the dim and fill, with a large user-space glow region', () => {
    const order = [...html.matchAll(/<path[^>]*?(data-outline="(\w+)"|fill-rule="evenodd"|fill-opacity="0.07")/g)].map((m) => m[2] ?? (m[1]!.includes('evenodd') ? 'dim' : 'fill'));
    expect(order).toEqual(['dim', 'fill', 'glow', 'under', 'line']);
    expect(html).toMatch(/<filter[^>]*filterUnits="userSpaceOnUse"[^>]*x="-162.4"[^>]*y="-82"[^>]*width="1136.8"[^>]*height="574"/);
    expect(html).not.toMatch(/dasharray/i);
  });
});

describe('Set my Zen page module', () => {
  it('imports without a runtime error', async () => {
    const module = await import('./ZenFlowV2');
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});
