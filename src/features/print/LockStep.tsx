import { useEffect, useRef, useState } from 'react';
import { canSpeak, type SpeakClock } from '../../calibration/setupCheck';
import { advanceLockFill, LOCK_HOLD_MS, lockMaySave, lockView, measureLockPose, movingMatch, type LockCheckId, type LockPose, type LockView } from '../../calibration/lockCoach';
import { calibrationConfig } from '../../calibration/config';
import { isGoodCalibrationFrame } from '../../lib/posture/baseline';
import type { Landmarks } from '../../lib/posture/types';
import { toScreen } from '../../lib/vision/toScreen';
import { speakCaption } from '../calibrate/glowVoice';
import { BodyGuides } from './BodyGuides';
import { loadResetAfter } from './resetLog';
import { useZenChrome, useZenVoice } from './zenChrome';

export interface LockResult {
  frames: Landmarks[];
  seen: number;
  good: number;
  coached: 'full' | 'partial' | 'skipped';
  /** Next was pressed, so this pose is saved even with a short hold. */
  forced?: boolean;
}

export function LockStep({
  landmarks,
  reducedMotion,
  onLocked,
  onBack,
}: {
  landmarks: Landmarks | null;
  reducedMotion: boolean;
  onLocked: (result: LockResult) => void;
  onBack: () => void;
}) {
  const { voice } = useZenVoice();
  const [view, setView] = useState<LockView | null>(null);
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [pending, setPending] = useState<LockResult | null>(null);
  const landmarksRef = useRef(landmarks);
  const voiceRef = useRef(voice);
  const speakRef = useRef<SpeakClock>({ line: null, atMs: 0 });
  const finished = useRef(false);
  const command = useRef<(kind: 'partial' | 'skip' | 'best' | 'advance') => void>(() => {});

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);
  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    let after = freshResetAfter();
    const started = Date.now();
    let baseline: LockPose[] = [];
    let held: Partial<Record<LockCheckId, boolean>> = {};
    let smooth: LockPose | null = null;
    let last = started;
    let progressNow = 0;
    let mode: 'coach' | 'hold' | 'partial' | 'skip' = 'coach';
    let seen = 0;
    let good: Landmarks[] = [];
    let best: Landmarks[] = [];
    let streak: Landmarks[] = [];
    let announced = 0;
    const id = window.setInterval(() => {
      if (finished.current) return;
      const now = Date.now();
      const dt = now - last;
      last = now;
      const elapsed = now - started;
      const frame = landmarksRef.current;
      const measured = frame ? measureLockPose(frame) : null;
      smooth = measured ? mixPose(smooth, measured, dt) : smooth;
      if (!after && measured) {
        baseline = [...baseline, measured].slice(-30);
        const qualified = baseline.filter((sample) => sample.faceRatio !== null && sample.shoulderGap !== null).length;
        if (qualified >= 8 || (elapsed >= 3_000 && baseline.length >= 1)) after = baselineFrom(baseline);
      }
      const next = lockView(smooth, after, held);
      held = Object.fromEntries(next.checks.map((check) => [check.id, check.pass])) as Partial<Record<LockCheckId, boolean>>;
      setView(next);
      if (next.passed > announced && voiceRef.current) {
        announced = next.passed;
        say('Nice, that\'s it.');
      }
      const coaching = mode === 'coach';
      if (coaching && next.ready) mode = 'hold';
      const active = mode === 'hold' || mode === 'partial' || mode === 'skip';
      const still = frame ? isGoodCalibrationFrame(frame) : false;
      const filling = active && (mode === 'skip' ? still : next.ready || (mode === 'partial' && next.passed >= 3));
      setHolding(filling);
      if (frame) {
        seen += 1;
        if (still && filling) {
          good = [...good, frame].slice(-180);
          streak = [...streak, frame].slice(-180);
          if (streak.length > best.length) best = streak;
        } else if (!filling) streak = [];
      }
      progressNow = advanceLockFill(progressNow, dt, filling, LOCK_HOLD_MS);
      setProgress(progressNow);
      if (!filling && next.tip) say(next.tip);
      if (progressNow >= 1 && lockMaySave(good.length)) {
        finished.current = true;
        const coached = mode === 'skip' ? 'skipped' : mode === 'partial' ? 'partial' : 'full';
        setBanner("Got it! That's your Zen.");
        speakRef.current = { line: null, atMs: 0 };
        say("Got it! That's your Zen.");
        const saved = good;
        const total = seen;
        setPending({ frames: saved, seen: total, good: saved.length, coached });
        return;
      }
      if (progressNow >= 1 && !lockMaySave(good.length) && elapsed >= calibrationConfig.lockExtendMs) return;
    }, 100);

    function say(line: string) {
      const at = Date.now();
      if (!voiceRef.current || !canSpeak(line, at, speakRef.current)) return;
      speakRef.current = { line, atMs: at };
      speakCaption(line, false, 1);
    }

    function startHold(kind: 'partial' | 'skip' | 'best' | 'advance') {
      if (kind === 'advance') {
        if (finished.current) return;
        const frameNow = landmarksRef.current;
        const frames = best.length > 0 ? best : good.length > 0 ? good : frameNow ? [frameNow] : [];
        finished.current = true;
        setBanner("Got it! That's your Zen.");
        say("Got it! That's your Zen.");
        setPending({ frames, seen: Math.max(seen, frames.length), good: frames.length, coached: frames.length ? 'partial' : 'skipped', forced: true });
        return;
      }
      if (kind === 'best') {
        if (!lockMaySave(best.length)) return;
        finished.current = true;
        setBanner("Got it! That's your Zen.");
        setPending({ frames: best, seen: Math.max(seen, best.length), good: best.length, coached: 'partial' });
        return;
      }
      mode = kind === 'skip' ? 'skip' : 'partial';
    }

    command.current = startHold;
    return () => {
      window.clearInterval(id);
    };
  }, []);

  const passed = view?.passed ?? 0;
  const poseNow = landmarks ? measureLockPose(landmarks) : null;
  const match = movingMatch(poseNow, passed, Boolean(view));
  const unseen = !poseNow;
  const holdingNow = holding && !banner;
  const title = banner ?? (unseen ? "I can't see you clearly" : holdingNow ? 'Hold it there' : view?.tip ?? 'Sit tall and look at the screen');
  const secondsLeft = Math.max(1, Math.ceil((1 - progress) * (LOCK_HOLD_MS / 1000)));
  const helper = banner ? "That's your Zen." : unseen ? 'Sit facing the screen.' : holdingNow ? `Locking in your Zen... ${secondsLeft} seconds` : 'Tall spine, shoulders relaxed, head over shoulders.';
  useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => onLocked(pending), 800);
    return () => window.clearTimeout(id);
  }, [onLocked, pending]);
  useZenChrome({
    title,
    helper,
    countdown: null,
    holdFraction: holdingNow ? progress : 0,
    nextLabel: 'Next',
    backLabel: 'Back',
    showCard: true,
    showNav: true,
    locking: holdingNow,
    match,
    icon: 'lock',
    onBack,
    onNext: () => {
      if (pending) {
        onLocked(pending);
        return;
      }
      command.current('advance');
    },
  });

  return (
    <>
      <EarLine landmarks={landmarks} />
      <BodyGuides landmarks={landmarks} hot={holding || Boolean(banner)} showArrow={!holding && !reducedMotion} breathElapsed={null} reduced={reducedMotion} />
    </>
  );
}

/** Use the Loosen up reading only if it was taken in the last 10 minutes on this device. */
function freshResetAfter() {
  try {
    const raw = window.localStorage.getItem('sitglow.resetMoves');
    const saved = raw ? (JSON.parse(raw) as { savedAt?: string }).savedAt : undefined;
    if (!saved || Date.now() - Date.parse(saved) > 10 * 60_000) return null;
  } catch {
    return null;
  }
  return loadResetAfter();
}

/** Baseline from the user's own first ~1.5 s when there is no fresh Loosen up reading. */
function baselineFrom(poses: LockPose[]) {
  const avg = (pick: (pose: LockPose) => number | null) => {
    const values = poses.map(pick).filter((value): value is number => value !== null);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  };
  const forward = avg((pose) => pose.forwardHead);
  return {
    shoulderY: avg((pose) => pose.shoulderY),
    faceRatio: avg((pose) => pose.faceRatio),
    shoulderGap: avg((pose) => pose.shoulderGap),
    forwardHead: poses.some((pose) => pose.forwardHead !== null) ? forward : undefined,
  };
}

function mixPose(previous: LockPose | null, next: LockPose, dtMs: number): LockPose {
  if (!previous) return next;
  const alpha = 1 - Math.exp(-Math.max(0, dtMs) / calibrationConfig.lockCoach.smoothMs);
  const mix = (from: number | null, to: number | null) => (to === null ? from : from === null ? to : from + (to - from) * alpha);
  return {
    shoulderY: mix(previous.shoulderY, next.shoulderY) ?? next.shoulderY,
    noseOffset: mix(previous.noseOffset, next.noseOffset),
    faceRatio: mix(previous.faceRatio, next.faceRatio),
    shoulderGap: mix(previous.shoulderGap, next.shoulderGap),
    tiltDeg: mix(previous.tiltDeg, next.tiltDeg),
    forwardHead: mix(previous.forwardHead, next.forwardHead),
    pitchDeg: mix(previous.pitchDeg, next.pitchDeg),
    rollDeg: mix(previous.rollDeg, next.rollDeg),
  };
}

function EarLine({ landmarks }: { landmarks: Landmarks | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 1, height: 1 });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const apply = () => setBox({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const left = landmarks?.leftEar && landmarks.leftShoulder ? { ear: landmarks.leftEar, shoulder: landmarks.leftShoulder } : null;
  const right = landmarks?.rightEar && landmarks.rightShoulder ? { ear: landmarks.rightEar, shoulder: landmarks.rightShoulder } : null;
  const best = [left, right].filter((side) => side !== null).sort((a, b) => (b.ear.visibility ?? 1) - (a.ear.visibility ?? 1))[0];
  if (!best || !landmarks || landmarks.videoWidth <= 0) return <div ref={ref} className="absolute inset-0" />;
  const ear = toScreen(best.ear.x, best.ear.y, landmarks.videoWidth, landmarks.videoHeight, box.width, box.height);
  const shoulder = toScreen(best.shoulder.x, best.shoulder.y, landmarks.videoWidth, landmarks.videoHeight, box.width, box.height);
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 text-outline">
      <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
        <line x1={ear.x} y1={ear.y} x2={shoulder.x} y2={shoulder.y} stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

