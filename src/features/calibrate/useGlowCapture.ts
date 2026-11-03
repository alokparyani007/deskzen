import { useCallback, useEffect, useRef, useState } from 'react';
import { computeBaseline } from '../../lib/posture/baseline';
import { postureConfig } from '../../lib/posture/config';
import { glowSamples, medianBaselines, setupChanged } from '../../lib/posture/glow';
import { recordGlowAttempt, saveGlowCheckDay, todayKey } from '../../lib/posture/glowStore';
import type { Baseline, Landmarks } from '../../lib/posture/types';

interface GlowCapture {
  sampleIndex: number;
  prompt: string;
  attempt: number;
  saved: Baseline | null;
  help: boolean;
  shifted: boolean;
  checkedOk: boolean;
  onComplete: (frames: Landmarks[]) => void;
  retry: () => void;
  noteStart: () => void;
}

export function useGlowCapture(
  pose: 'sit' | 'stand',
  check: boolean,
  existing: Baseline | null,
  save: (baseline: Baseline) => Promise<void>,
  saveStanding: (baseline: Baseline) => Promise<void>,
): GlowCapture {
  const bundles = useRef<Baseline[]>([]);
  const fails = useRef(0);
  const started = useRef<number | null>(null);
  const logged = useRef(false);
  const [sampleIndex, setSampleIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<Baseline | null>(null);
  const [help, setHelp] = useState(false);
  const [shifted, setShifted] = useState(false);
  const [checkedOk, setCheckedOk] = useState(false);
  const modeKey = `${pose}|${check ? 1 : 0}`;
  const [epoch, setEpoch] = useState(modeKey);
  if (epoch !== modeKey) {
    setEpoch(modeKey);
    setSampleIndex(0);
    setSaved(null);
    setHelp(false);
    setShifted(false);
    setCheckedOk(false);
    setAttempt((value) => value + 1);
  }

  useEffect(() => {
    bundles.current = [];
    fails.current = 0;
    logged.current = false;
    started.current = null;
  }, [modeKey]);

  const finishLog = useCallback(
    (ok: boolean) => {
      if (logged.current) return;
      logged.current = true;
      const startedAt = started.current ?? Date.now();
      const finishedAt = Date.now();
      recordGlowAttempt({ startedAt, finishedAt, durationMs: finishedAt - startedAt, ok, pose });
    },
    [pose],
  );

  const onComplete = useCallback(
    (frames: Landmarks[]) => {
      const next = computeBaseline(frames);
      if (!next.ok) {
        const count = fails.current + 1;
        fails.current = count;
        if (count >= postureConfig.calibration.helpAfterFails) {
          setHelp(true);
          finishLog(false);
        } else setAttempt((value) => value + 1);
        return;
      }
      fails.current = 0;
      if (check && existing) {
        if (setupChanged(existing.ipdPx, next.baseline.ipdPx)) setShifted(true);
        else {
          setCheckedOk(true);
          saveGlowCheckDay(todayKey());
        }
        finishLog(true);
        return;
      }
      const sample = { ...next.baseline, pose };
      bundles.current = [...bundles.current, sample];
      if (bundles.current.length < glowSamples(pose).length) {
        setSampleIndex(bundles.current.length);
        setAttempt((value) => value + 1);
        return;
      }
      const merged = { ...medianBaselines(bundles.current), pose };
      setSaved(merged);
      finishLog(true);
      void (pose === 'stand' ? saveStanding(merged) : save(merged));
    },
    [check, existing, finishLog, pose, save, saveStanding],
  );

  const retry = useCallback(() => {
    fails.current = 0;
    bundles.current = [];
    logged.current = false;
    setHelp(false);
    setSampleIndex(0);
    setAttempt((value) => value + 1);
  }, []);

  const noteStart = useCallback(() => {
    if (started.current === null) started.current = Date.now();
  }, []);

  return {
    sampleIndex,
    prompt: glowSamples(pose)[sampleIndex] ?? glowSamples(pose)[0]!,
    attempt,
    saved,
    help,
    shifted,
    checkedOk,
    onComplete,
    retry,
    noteStart,
  };
}
