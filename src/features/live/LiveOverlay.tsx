import { useEffect, useRef, type RefObject } from 'react';
import type { LockedPose } from '../../calibration/lockedPose';
import { denormalizeContour, type Silhouette } from '../../lib/posture/silhouette';
import type { Landmarks } from '../../lib/posture/types';
import { landmarkBodyPoints } from '../print/landmarkBody';
import type { OutlineKind } from './coach';
import {
  anchorOutline,
  headCenter,
  headGap,
  landmarkOutlinePoints,
  placeOnShoulders,
  pointsToPath,
  showGuideArrow,
  smoothAnchor,
  toScreen,
  curveArrow,
  arrowHead,
  genericOutline,
  type OutlineAnchor,
  type ScreenPoint,
} from './outline';

export interface OverlayModel {
  kind: OutlineKind;
  landmarks: Landmarks | null;
  silhouette: Silhouette | null;
  pose: LockedPose | null;
  percent: number | null;
  pulse: boolean;
  celebrate: boolean;
  reduced: boolean;
  drifting: boolean;
  ghost?: boolean;
}

export function LiveOverlay({ modelRef }: { modelRef: RefObject<OverlayModel | null> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const arrowRef = useRef<SVGPathElement>(null);
  const headRef = useRef<SVGPathElement>(null);
  const targetRef = useRef<SVGPathElement>(null);
  const anchorRef = useRef<{ key: string; anchor: OutlineAnchor | null }>({ key: '', anchor: null });

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = window.requestAnimationFrame(paint);
      const host = hostRef.current;
      const svg = svgRef.current;
      const glow = glowRef.current;
      const stroke = strokeRef.current;
      const arrow = arrowRef.current;
      const head = headRef.current;
      const target = targetRef.current;
      if (!host || !svg || !glow || !stroke || !arrow || !head || !target) return;
      const box = host.getBoundingClientRect();
      const viewWidth = box.width;
      const viewHeight = box.height;
      if (viewWidth < 2 || viewHeight < 2) return;
      svg.setAttribute('viewBox', `0 0 ${viewWidth} ${viewHeight}`);
      const model = modelRef.current;
      const saved = model ? screenPoints(model, viewWidth, viewHeight, anchorRef) : null;
      const liveBody = model?.drifting ? liveBodyScreen(model, viewWidth, viewHeight) : null;
      if (!model || !saved || saved.length < 3) {
        stroke.setAttribute('d', '');
        glow.setAttribute('d', '');
        target.setAttribute('d', '');
        arrow.setAttribute('d', '');
        head.setAttribute('d', '');
        return;
      }
      const path = pointsToPath(saved);
      const ghost = Boolean(model.ghost);
      stroke.setAttribute('d', path);
      glow.setAttribute('d', ghost ? '' : path);
      stroke.setAttribute('stroke', 'var(--color-outline)');
      glow.setAttribute('stroke', 'var(--color-outline)');
      stroke.setAttribute('stroke-width', '3');
      glow.setAttribute('stroke-width', '3');
      stroke.setAttribute('stroke-opacity', ghost ? '0.45' : '1');
      stroke.setAttribute('stroke-dasharray', ghost ? '8 7' : '');
      glow.setAttribute('stroke-opacity', model.celebrate ? '0.85' : '0.45');
      stroke.classList.toggle('outline-pulse', (model.pulse || model.celebrate) && !model.reduced && !ghost);
      target.setAttribute('d', !ghost && liveBody && liveBody.length >= 3 ? pointsToPath(liveBody) : '');
      target.setAttribute('stroke', 'var(--color-glow)');
      target.setAttribute('stroke-width', '3');
      target.setAttribute('stroke-dasharray', '8 6');
      target.setAttribute('stroke-opacity', '1');
      if (ghost) {
        arrow.setAttribute('d', '');
        head.setAttribute('d', '');
      } else {
        paintArrow(arrow, head, model, saved, viewWidth, viewHeight);
      }
    };
    frame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frame);
  }, [modelRef]);

  return (
    <div ref={hostRef} className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      <svg ref={svgRef} className="h-full w-full">
        <defs>
          <filter id="live-outline-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <path ref={glowRef} fill="none" stroke="var(--color-print)" strokeWidth="3" filter="url(#live-outline-glow)" />
        <path ref={targetRef} fill="none" stroke="var(--color-print)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path ref={strokeRef} fill="none" stroke="var(--color-print)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path ref={arrowRef} fill="none" stroke="var(--color-outline)" strokeWidth="3" strokeLinecap="round" />
        <path ref={headRef} fill="none" stroke="var(--color-outline)" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function screenPoints(
  model: OverlayModel,
  viewWidth: number,
  viewHeight: number,
  anchorRef: { current: { key: string; anchor: OutlineAnchor | null } },
): ScreenPoint[] | null {
  const frame = model.landmarks;
  const videoWidth = frame?.videoWidth ?? 0;
  const videoHeight = frame?.videoHeight ?? 0;
  if (!frame || videoWidth <= 0 || videoHeight <= 0) return null;
  const placed = placedOutline(model, frame, anchorRef);
  if (!placed) return model.ghost || model.kind === 'generic' ? genericOutline(viewWidth, viewHeight) : null;
  return placed.map((point) => toScreen(point.x, point.y, videoWidth, videoHeight, viewWidth, viewHeight));
}

function placedOutline(
  model: OverlayModel,
  frame: Landmarks,
  anchorRef: { current: { key: string; anchor: OutlineAnchor | null } },
): ScreenPoint[] | null {
  const live = liveLine(frame);
  if (!live) return null;
  if (model.kind === 'locked' && model.pose) {
    if (anchorRef.current.key !== 'locked') anchorRef.current = { key: 'locked', anchor: null };
    const anchor = smoothAnchor(anchorRef.current.anchor, { scale: live.width, x: live.x, y: live.y });
    anchorRef.current = { key: 'locked', anchor };
    const half = anchor.scale / 2;
    return placeOnShoulders(landmarkOutlinePoints(model.pose), model.pose, {
      ...frame,
      leftShoulder: { x: anchor.x - half, y: anchor.y, visibility: 1 },
      rightShoulder: { x: anchor.x + half, y: anchor.y, visibility: 1 },
    });
  }
  if (model.kind === 'silhouette' && model.silhouette) {
    const anchors = model.silhouette.anchors;
    const savedWidth = anchors.shoulderWidth;
    if (savedWidth <= 1) return null;
    if (anchorRef.current.key !== 'silhouette') anchorRef.current = { key: 'silhouette', anchor: null };
    const anchor = smoothAnchor(anchorRef.current.anchor, { scale: live.width / savedWidth, x: live.x, y: live.y });
    anchorRef.current = { key: 'silhouette', anchor };
    const savedMid = { x: anchors.shoulderX, y: anchors.shoulderY };
    const points = denormalizeContour(model.silhouette.points, anchors);
    return anchorOutline(points, savedMid, savedWidth, anchor.x, anchor.y, savedWidth * anchor.scale);
  }
  return null;
}

function paintArrow(
  arrow: SVGPathElement,
  head: SVGPathElement,
  model: OverlayModel,
  points: ScreenPoint[],
  viewWidth: number,
  viewHeight: number,
): void {
  const nose = model.landmarks?.nose;
  const videoWidth = model.landmarks?.videoWidth ?? 0;
  const videoHeight = model.landmarks?.videoHeight ?? 0;
  const outlineHead = headCenter(points);
  if (!nose || model.percent === null || videoWidth <= 0 || !outlineHead) {
    arrow.setAttribute('d', '');
    head.setAttribute('d', '');
    return;
  }
  const liveHead = toScreen(nose.x, nose.y, videoWidth, videoHeight, viewWidth, viewHeight);
  if (!showGuideArrow(model.percent, headGap(liveHead, outlineHead, viewWidth, viewHeight))) {
    arrow.setAttribute('d', '');
    head.setAttribute('d', '');
    return;
  }
  arrow.setAttribute('d', curveArrow(liveHead, outlineHead));
  head.setAttribute('d', arrowHead(liveHead, outlineHead));
}

function liveBodyScreen(model: OverlayModel, viewWidth: number, viewHeight: number): ScreenPoint[] | null {
  const frame = model.landmarks;
  if (!frame || frame.videoWidth <= 0) return null;
  const points = landmarkBodyPoints(frame);
  if (!points || points.length < 3) return null;
  return points.map((point) => toScreen(point.x, point.y, frame.videoWidth, frame.videoHeight, viewWidth, viewHeight));
}

function liveLine(frame: Landmarks): { x: number; y: number; width: number } | null {
  if (!frame.leftShoulder || !frame.rightShoulder) return null;
  const width = Math.hypot(frame.rightShoulder.x - frame.leftShoulder.x, frame.rightShoulder.y - frame.leftShoulder.y);
  if (width < 8) return null;
  return { x: (frame.leftShoulder.x + frame.rightShoulder.x) / 2, y: (frame.leftShoulder.y + frame.rightShoulder.y) / 2, width };
}
