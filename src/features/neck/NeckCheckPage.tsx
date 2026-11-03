import { useEffect, useRef, useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { tiltFromHorizontalDeg } from '../../lib/posture/signals';
import { saveNeckCheck, type NeckCheck } from '../../lib/storage/history';
import { useCamera } from '../camera/camera-context';
import { stretchById } from '../stretches/data';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';

const steps = [
  { id: 'up', cue: 'Look up' },
  { id: 'down', cue: 'Look down' },
  { id: 'left', cue: 'Look left' },
  { id: 'right', cue: 'Look right' },
  { id: 'level', cue: 'Look level' },
] as const;

type StepId = (typeof steps)[number]['id'];

export function NeckCheckPage() {
  usePageTitle('Neck check-in');
  const { status, start } = useCamera();
  const { baseline } = useBaseline();
  const { landmarks } = useSession();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(6);
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<NeckCheck | null>(null);
  const storedAt = useRef<string | null>(null);
  const indexRef = useRef(0);
  const leftRef = useRef(6);
  const samplesRef = useRef<Partial<Record<StepId, number | null>>>({});
  const landmarksRef = useRef(landmarks);
  const baselineRef = useRef(baseline);
  const step = steps[index];
  const header = stretchById('neck-side');

  useEffect(() => {
    landmarksRef.current = landmarks;
    baselineRef.current = baseline;
  }, [landmarks, baseline]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current > 0) {
        setLeft(leftRef.current);
        return;
      }
      const active = steps[indexRef.current];
      if (!active) return;
      samplesRef.current = { ...samplesRef.current, [active.id]: eyeAngle(landmarksRef.current) };
      if (indexRef.current >= steps.length - 1) {
        const next = samplesRef.current;
        setSaved({
          at: new Date().toISOString(),
          up: next.up ?? null,
          down: next.down ?? null,
          left: next.left ?? null,
          right: next.right ?? null,
          level: next.level ?? null,
          baselineEyeDeg: baselineRef.current?.eyeAngleDeg ?? null,
        });
        setRunning(false);
        return;
      }
      indexRef.current += 1;
      leftRef.current = 6;
      setIndex(indexRef.current);
      setLeft(6);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!saved || storedAt.current === saved.at) return;
    storedAt.current = saved.at;
    void saveNeckCheck(saved);
  }, [saved]);

  const levelGap =
    saved?.level !== null && saved?.level !== undefined && saved.baselineEyeDeg !== null
      ? Math.abs(saved.level - saved.baselineEyeDeg)
      : null;

  return (
    <section className="mx-auto max-w-lg px-4 py-6">
      {header?.image ? (
        <img src={header.image} alt={header.name} loading="lazy" className="mb-4 aspect-[4/3] w-full rounded-2xl object-cover" />
      ) : null}
      <h1 className="text-3xl font-semibold text-white">Neck check-in</h1>
      <p className="mt-2 text-sm text-white/70">
        A 30-second check-in. This compares today&apos;s head position with your saved posture. It is not a diagnosis.
      </p>
      {status !== 'live' ? (
        <button type="button" className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white" onClick={() => void start()}>
          Turn on camera
        </button>
      ) : null}
      {!running && !saved ? (
        <button type="button" className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setRunning(true)}>
          Start check-in
        </button>
      ) : null}
      {running && step ? (
        <div className="mt-6" aria-live="polite">
          <p className="text-sm text-white/70">Step {index + 1} of {steps.length}</p>
          <p className="mt-2 text-4xl font-semibold text-white">{step.cue}</p>
          <p className="mt-2 text-5xl font-semibold tabular-nums text-outline">{Math.max(left, 0)}</p>
        </div>
      ) : null}
      {saved ? (
        <p className="mt-6 text-sm text-white" role="status">
          Check-in saved.
          {levelGap === null ? ' Level look is stored as a number next to your baseline.' : ` Your level look is about ${levelGap.toFixed(1)}° from the eye line you saved.`}
        </p>
      ) : null}
      <p className="mt-6 text-xs text-white/70">DeskZen is a wellness tool, not a medical device.</p>
    </section>
  );
}

function eyeAngle(landmarks: { leftEye?: { x: number; y: number }; rightEye?: { x: number; y: number } } | null): number | null {
  if (!landmarks?.leftEye || !landmarks.rightEye) return null;
  return tiltFromHorizontalDeg(landmarks.leftEye, landmarks.rightEye);
}
