import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DeviceLock } from '../../components/DeviceLock';
import { usePageTitle } from '../../hooks/usePageTitle';
import { spotAlertCopy, type SpotIssue } from '../../lib/spotcheck/verdict';
import { CameraStage } from '../camera/CameraStage';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';

const FIX_MS = 20_000;

export function SpotFixPage() {
  usePageTitle('Posture fix');
  const { status, errorName, start, pause } = useCamera();
  const { baseline, standing } = useBaseline();
  const { posture, landmarks } = useSession();
  const [params] = useSearchParams();
  const issue = parseIssue(params.get('issue'));
  const saved = posture === 'standing' && standing ? standing : baseline;
  const [left, setLeft] = useState(FIX_MS);

  useEffect(() => {
    void start();
    return () => pause();
  }, [start, pause]);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const remaining = Math.max(0, FIX_MS - (Date.now() - started));
      setLeft(remaining);
      if (remaining === 0) pause();
    }, 250);
    return () => window.clearInterval(id);
  }, [pause]);

  const seconds = Math.ceil(left / 1000);

  return (
    <section className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold text-white">A quick fix</h1>
        <DeviceLock />
      </div>
      <p className="mt-2 text-sm text-white/70">{spotAlertCopy(issue)}</p>
      <p className="mt-1 text-sm font-semibold text-white" aria-live="polite">
        {left === 0 ? 'Camera off.' : `${seconds} seconds left. The camera turns off when this ends.`}
      </p>
      {status === 'live' ? (
        <div className="relative mt-4">
          <CameraStage landmarks={landmarks} alignment={null} baseline={saved} showGhost={Boolean(saved)} showLandmarks={false} badgeAt="top" />
          <p className="absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Checking posture</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/70">{errorName ? 'The camera needs permission before this fix can start.' : 'Turning the camera on…'}</p>
      )}
      <Link to="/app" className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white" onClick={() => pause()}>
        Done
      </Link>
      <p className="mt-4 text-xs text-white/70">DeskZen is a wellness tool, not a medical device. Nothing is recorded.</p>
    </section>
  );
}

function parseIssue(value: string | null): SpotIssue | null {
  if (value === 'lean' || value === 'headDrop' || value === 'shoulders' || value === 'distance' || value === 'hipLean') return value;
  return 'lean';
}
