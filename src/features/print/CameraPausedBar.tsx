import { useEffect, useRef, useState } from 'react';
import { cameraWatchStep } from './cameraWatch';
import { useCamera } from '../camera/camera-context';

export function CameraPausedBar({ live, video, lastLandmarkMs }: { live: boolean; video: HTMLVideoElement | null; lastLandmarkMs: number | null }) {
  const camera = useCamera();
  const [show, setShow] = useState(false);
  const nudged = useRef(false);
  const origin = useRef(Date.now());
  const lastRef = useRef(lastLandmarkMs);
  const videoRef = useRef(video);
  useEffect(() => {
    lastRef.current = lastLandmarkMs;
    videoRef.current = video;
  });

  useEffect(() => {
    origin.current = Date.now();
    nudged.current = false;
    setShow(false);
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const mark = lastRef.current ?? origin.current;
      const current = videoRef.current;
      const paused = !current || current.paused || current.readyState < 2;
      const step = cameraWatchStep({ landmarkStaleMs: now - mark, videoPaused: paused, nudged: nudged.current });
      if (step.nudge && current?.srcObject) {
        nudged.current = true;
        void current.play().catch(() => {});
      }
      if (!paused && lastRef.current !== null && now - lastRef.current < 2_000) nudged.current = false;
      setShow(step.showPaused);
    }, 250);
    return () => window.clearInterval(id);
  }, [live]);

  if (!show) return null;
  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-24 z-[70] mx-auto flex w-[min(24rem,calc(100%-2rem))] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lg lg:bottom-6">
      <p className="text-sm font-semibold">Camera paused</p>
      <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={() => void camera.resume()}>
        Resume
      </button>
    </div>
  );
}
