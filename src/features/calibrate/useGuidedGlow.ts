import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { headOffset, initialRing, orbInside, ringProgress, shouldersLevel, smoothOrb, stepRing, type OrbPoint, type RingState } from '../../lib/posture/bubble';
import { postureConfig } from '../../lib/posture/config';
import { guideAt, planFor } from '../../lib/posture/glowGuide';
import { lightIsOk, setupViewChanged } from '../../lib/posture/glow';
import { recordGlowAttempt, saveGlowCheckDay, todayKey } from '../../lib/posture/glowStore';
import { blendBaseline, frameSnapshot, medianCapture } from '../../lib/posture/glowUp';
import type { Baseline, Landmarks } from '../../lib/posture/types';
import { playLockIn, speakCaption, stopSpeech } from './glowVoice';

export type GlowMode = 'full' | 'tune' | 'check' | 'recheck';

const MUTE_KEY = 'sitglow.glowMuted';

export function useGuidedGlow(
  pose: 'sit' | 'stand',
  mode: GlowMode,
  landmarks: Landmarks | null,
  live: boolean,
  existing: Baseline | null,
  save: (baseline: Baseline) => Promise<void>,
  saveStanding: (baseline: Baseline) => Promise<void>,
) {
  const plan = useMemo(() => planFor(mode, pose), [mode, pose]);
  const [attempt, setAttempt] = useState(0);
  const [clock, setClock] = useState(0);
  const [orb, setOrb] = useState<OrbPoint>({ x: 0, y: 0 });
  const [ring, setRing] = useState<RingState>(initialRing());
  const [level, setLevel] = useState(false);
  const [phase, setPhase] = useState<'guide' | 'locked' | 'reveal' | 'help' | 'shifted' | 'checked'>('guide');
  const [saved, setSaved] = useState<Baseline | null>(null);
  const [before, setBefore] = useState<Baseline | null>(null);
  const [lit, setLit] = useState(true);
  const [muted, setMuted] = useState(() => window.localStorage.getItem(MUTE_KEY) === '1');
  const key = `${pose}|${mode}|${attempt}`;
  const [epoch, setEpoch] = useState(key);
  const started = useRef<number | null>(null);
  const lastAt = useRef<number | null>(null);
  const orbRef = useRef<OrbPoint | null>(null);
  const ringRef = useRef<RingState>(initialRing());
  const frames = useRef<Landmarks[]>([]);
  const beforeTaken = useRef(false);
  const retries = useRef(0);
  const lockedAt = useRef<number | null>(null);
  const finished = useRef(false);
  const logged = useRef(false);

  if (epoch !== key) {
    setEpoch(key);
    setClock(0);
    setPhase('guide');
    setSaved(null);
    setRing(initialRing());
    setBefore(null);
  }

  useEffect(() => {
    started.current = null;
    lastAt.current = null;
    orbRef.current = null;
    ringRef.current = initialRing();
    frames.current = [];
    beforeTaken.current = false;
    lockedAt.current = null;
    finished.current = false;
    logged.current = false;
  }, [key]);

  useEffect(() => {
    if (live) return;
    started.current = null;
    lastAt.current = null;
    frames.current = [];
    ringRef.current = initialRing();
    retries.current = 0;
    finished.current = false;
    const id = window.setTimeout(() => {
      setClock(0);
      setRing(initialRing());
      setPhase((current) => (current === 'help' ? 'guide' : current));
    }, 0);
    return () => window.clearTimeout(id);
  }, [live]);

  const captureMs = Math.min(postureConfig.glow.captureMs, plan.totalMs);
  const place = guideAt(clock, plan.steps, plan.totalMs, captureMs);
  const finishLog = useCallback((ok: boolean) => {
    if (logged.current) return;
    logged.current = true;
    const startedAt = started.current ?? Date.now();
    const finishedAt = Date.now();
    recordGlowAttempt({ startedAt, finishedAt, durationMs: finishedAt - startedAt, ok, pose, retries: retries.current });
  }, [pose]);

  useEffect(() => {
    if (phase !== 'guide' || !live) return;
    speakCaption(place.step.caption, muted);
    return () => stopSpeech();
  }, [place.step.id, place.step.caption, muted, phase, live, key]);

  useEffect(() => {
    if (!live || !landmarks) return;
    const now = Date.now();
    if (started.current === null) started.current = now;
    const elapsed = now - started.current;
    const dtMs = lastAt.current === null ? 0 : Math.min(2000, now - lastAt.current);
    lastAt.current = now;
    setClock(elapsed);
    setLit(lightIsOk(landmarks));
    if (!beforeTaken.current) {
      const snap = frameSnapshot(landmarks);
      if (snap) {
        beforeTaken.current = true;
        setBefore({ ...snap, pose });
      }
    }
    const offset = headOffset(landmarks.nose, landmarks.leftShoulder, landmarks.rightShoulder);
    const smoothed = offset ? smoothOrb(orbRef.current, offset, dtMs / 1000) : orbRef.current;
    if (smoothed) {
      orbRef.current = smoothed;
      setOrb(smoothed);
    }
    const shoulders = shouldersLevel(landmarks.leftShoulder, landmarks.rightShoulder);
    setLevel(shoulders);
    const inside = Boolean(smoothed && orbInside(smoothed) && shoulders);
    const capturing = elapsed >= plan.totalMs - captureMs;

    if (phase === 'locked') {
      if (lockedAt.current !== null && now - lockedAt.current > 1100) setPhase('reveal');
      return;
    }
    if (phase !== 'guide' || finished.current) return;

    if (capturing && inside) frames.current = [...frames.current, landmarks].slice(-180);
    const nextRing = capturing ? stepRing(ringRef.current, inside, dtMs) : ringRef.current;
    ringRef.current = nextRing;
    setRing(nextRing);

    if (!nextRing.done) {
      if (elapsed > plan.totalMs + 25_000) {
        finishLog(false);
        setPhase('help');
      }
      return;
    }

    const captured = medianCapture(frames.current);
    if (!captured) {
      if (frames.current.length >= postureConfig.calibration.minSamples) {
        retries.current += 1;
        frames.current = [];
        ringRef.current = initialRing();
        setRing(initialRing());
        if (retries.current >= postureConfig.calibration.helpAfterFails) {
          finishLog(false);
          setPhase('help');
        }
      } else if (elapsed > plan.totalMs + 25_000) {
        finishLog(false);
        setPhase('help');
      }
      return;
    }

    finished.current = true;
    const sample = { ...captured, pose };
    if (mode === 'check' || mode === 'recheck') {
      const changed = existing
        ? setupViewChanged(existing, { ipdPx: sample.ipdPx, shoulderAngleDeg: sample.shoulderAngleDeg, noseY: sample.nose.y })
        : false;
      finishLog(true);
      if (!changed) saveGlowCheckDay(todayKey());
      setPhase(changed ? 'shifted' : 'checked');
      return;
    }
    const merged = mode === 'tune' && existing ? { ...blendBaseline(existing, sample), pose } : sample;
    setSaved(merged);
    lockedAt.current = now;
    setPhase('locked');
    playLockIn();
    finishLog(true);
    void (pose === 'stand' ? saveStanding(merged) : save(merged));
  }, [landmarks, live, phase, pose, mode, existing, save, saveStanding, plan.totalMs, captureMs, finishLog]);

  function toggleMute(): void {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      if (next) stopSpeech();
      return next;
    });
  }

  function retry(): void {
    retries.current = 0;
    setAttempt((value) => value + 1);
  }

  return {
    caption: place.step.caption,
    stepIndex: plan.steps.findIndex((step) => step.id === place.step.id) + 1,
    stepCount: plan.steps.length,
    muted,
    toggleMute,
    orb,
    ringProgress: ringProgress(ring),
    ringPaused: ring.paused,
    shouldersOk: level,
    phase,
    saved,
    before,
    lightOk: lit,
    retry,
  };
}
