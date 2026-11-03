import { useEffect, useState } from 'react';
import { postureConfig } from '../lib/posture/config';
import type { Landmarks } from '../lib/posture/types';
import { loadVisionSession, type VisionSession } from '../lib/vision/session';

export type VisionStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useLandmarks(video: HTMLVideoElement | null, live: boolean): {
  landmarks: Landmarks | null;
  wallMs: number | null;
  visionStatus: VisionStatus;
  visionError: string | null;
} {
  const active = Boolean(live && video);
  const [detected, setDetected] = useState<Landmarks | null>(null);
  const [wallMs, setWallMs] = useState<number | null>(null);
  const [visionStatus, setVisionStatus] = useState<VisionStatus>('idle');
  const [visionError, setVisionError] = useState<string | null>(null);
  const [trackedActive, setTrackedActive] = useState(active);

  if (active !== trackedActive) {
    setTrackedActive(active);
    setDetected(null);
    setWallMs(null);
    setVisionError(null);
    setVisionStatus(active ? 'loading' : 'idle');
  }

  useEffect(() => {
    if (!live || !video) return;


    let stopped = false;
    let handle = 0;
    let usingVideoFrame = false;
    let lastDetect = 0;
    let session: VisionSession | null = null;

    void loadVisionSession()
      .then((loaded) => {
        if (stopped) return;
        session = loaded;
        setVisionStatus('ready');
        schedule();
      })
      .catch(() => {
        if (stopped) return;
        setVisionStatus('error');
        setVisionError('The on-device model did not load. Run npm run fetch-models, then refresh.');
      });

    const tick = () => {
      if (stopped || !session) return;
      const fps = document.hidden ? postureConfig.inferenceFpsHidden : postureConfig.inferenceFpsVisible;
      const now = performance.now();
      if (now - lastDetect < 1000 / fps) return;
      if (video.paused || video.readyState < 2) return;
      lastDetect = now;
      try {
        const next = session.detect(video, Math.round(now));
        if (next) {
          setWallMs(Date.now());
          setDetected(next);
        }
      } catch {
        /* One bad frame should not stop the loop. */
      }
    };

    const schedule = () => {
      if (stopped) return;
      usingVideoFrame = false;
      handle = window.requestAnimationFrame(() => {
        tick();
        schedule();
      });
    };

    return () => {
      stopped = true;
      const videoWithFrame = video as HTMLVideoElement & {
        cancelVideoFrameCallback?: (id: number) => void;
      };
      if (usingVideoFrame) videoWithFrame.cancelVideoFrameCallback?.(handle);
      else window.cancelAnimationFrame(handle);
    };
  }, [live, video]);

  return {
    landmarks: active ? detected : null,
    wallMs: active ? wallMs : null,
    visionStatus,
    visionError,
  };
}
