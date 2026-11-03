import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { postureConfig } from '../../lib/posture/config';
import type { GuideFill } from '../../lib/posture/glow';
import type { Alignment, Baseline, Landmarks } from '../../lib/posture/types';
import { PosturePill } from '../posture/PosturePill';
import { useCamera } from './camera-context';
import { drawOverlay } from './drawOverlay';

interface CameraStageProps {
  landmarks: Landmarks | null;
  alignment: Alignment | null;
  baseline?: Baseline | null;
  showGuides?: boolean;
  showGhost?: boolean;
  showLandmarks?: boolean;
  holdProgress?: number;
  holdTicking?: boolean;
  holdMs?: number;
  guideFill?: GuideFill;
  badgeAt?: 'top' | 'bottom';
  frame?: 'default' | 'compact' | 'guide' | 'fill' | 'live';
  status?: string | null;
  posture?: 'sitting' | 'standing' | null;
  /** bare hides the built-in badges so Live view can draw its own. */
  chrome?: 'full' | 'bare';
  /** object-position for the live crop, so the shoulders stay in frame. */
  objectPosition?: string;
  children?: ReactNode;
}

export const CameraStage = forwardRef<HTMLDivElement, CameraStageProps>(function CameraStage({
  landmarks,
  alignment,
  baseline = null,
  showGuides = false,
  showGhost = false,
  showLandmarks = true,
  holdProgress = 0,
  holdTicking = false,
  holdMs = postureConfig.calibration.holdMs,
  guideFill,
  badgeAt = 'bottom',
  frame = 'default',
  status = null,
  posture = null,
  chrome = 'full',
  objectPosition,
  children,
}, ref) {
  const { placeVideo } = useCamera();
  const slotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawState = useRef({
    landmarks,
    alignment,
    baseline,
    showGuides,
    showGhost,
    showLandmarks,
    holdProgress,
    holdTicking,
    guideFill,
    holdMs,
  });

  useEffect(() => {
    drawState.current = { landmarks, alignment, baseline, showGuides, showGhost, showLandmarks, holdProgress, holdTicking, guideFill, holdMs };
  }, [landmarks, alignment, baseline, showGuides, showGhost, showLandmarks, holdProgress, holdTicking, guideFill, holdMs]);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    placeVideo(slot);
    const video = slot.querySelector('video');
    if (video && (frame === 'guide' || frame === 'fill' || frame === 'live')) video.classList.replace('object-fill', 'object-cover');
    return () => {
      slot.querySelector('video')?.classList.replace('object-cover', 'object-fill');
      placeVideo(null);
    };
  }, [placeVideo, frame]);

  useEffect(() => {
    const video = slotRef.current?.querySelector('video');
    if (video instanceof HTMLVideoElement) video.style.objectPosition = objectPosition || 'center center';
  }, [objectPosition, frame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let lastProgress = -1;
    let progressAt = performance.now();
    const paint = () => {
      const current = drawState.current;
      const width = current.landmarks?.videoWidth ?? 640;
      const height = current.landmarks?.videoHeight ?? 480;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      if (current.holdProgress !== lastProgress) {
        lastProgress = current.holdProgress;
        progressAt = performance.now();
      }
      const extra = current.holdTicking ? (performance.now() - progressAt) / current.holdMs : 0;
      const shown = Math.min(current.holdTicking ? 0.98 : 1, current.holdProgress + Math.max(0, extra));
      drawOverlay(canvas, {
        landmarks: current.showLandmarks ? current.landmarks : null,
        alignment: current.alignment,
        baseline: current.baseline,
        showGuides: current.showGuides,
        showGhost: current.showGhost,
        holdProgress: shown,
        guideFill: current.guideFill,
      });
    };
    if (!showGuides) return;
    const loop = () => {
      paint();
      frame = window.requestAnimationFrame(loop);
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [showGuides]);

  useEffect(() => {
    if (showGuides) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = landmarks?.videoWidth ?? 640;
    const height = landmarks?.videoHeight ?? 480;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    drawOverlay(canvas, {
      landmarks: showLandmarks ? landmarks : null,
      alignment,
      baseline,
      showGuides,
      showGhost,
      holdProgress: 0,
    });
  }, [showGuides, landmarks, alignment, baseline, showGhost, showLandmarks]);

  const width = landmarks?.videoWidth ?? 640;
  const height = landmarks?.videoHeight ?? 480;

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden bg-ink ${frame === 'fill' ? 'absolute inset-0 h-full w-full max-w-none rounded-none' : frame === 'live' ? 'h-full min-h-0 w-full max-w-none rounded-3xl bg-stage shadow-[0_16px_40px_rgb(15_23_42/0.12)]' : frame === 'guide' ? 'mx-auto w-full rounded-2xl aspect-video' : `mx-auto w-full max-w-3xl rounded-2xl ${frame === 'compact' ? 'max-h-[30vh] sm:max-h-[36vh]' : 'max-h-[46vh] sm:max-h-[56vh] lg:max-h-[62vh]'}`}`}
      style={frame === 'guide' || frame === 'fill' || frame === 'live' ? undefined : { aspectRatio: `${width} / ${height}` }}
    >
      <div ref={slotRef} className="absolute inset-0" />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100"
        aria-hidden="true"
      />
      {chrome === 'full' ? (
        <>
          <p
            className={`absolute left-3 rounded-full bg-white/95 px-2.5 py-1 text-xs text-ink ${badgeAt === 'top' ? 'top-3' : 'bottom-3'}`}
          >
            Live, on-device, no video saved
          </p>
          {posture ? <PosturePill posture={posture} className="absolute bottom-3 right-3" /> : null}
          {status ? (
            <p
              className="absolute left-1/2 top-3 max-w-[90%] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-center text-sm font-medium text-ink"
              role="status"
            >
              {status}
            </p>
          ) : null}
        </>
      ) : null}
      {children}
    </div>
  );
});
