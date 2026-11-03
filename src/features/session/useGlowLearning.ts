import { useEffect, useRef, useState } from 'react';
import { initialGreat, noteAlertDismiss, stepGreatMoment, tooStrict } from '../../lib/posture/adaptiveGlow';
import { postureConfig } from '../../lib/posture/config';
import { frameSignals } from '../../lib/posture/signals';
import { blendBaseline, medianCapture } from '../../lib/posture/glowUp';
import { loadDismissTimes, loadGlowOfferDay, loadStrictDay, saveDismissTimes, saveGlowOfferDay, saveStrictDay, todayKey } from '../../lib/posture/glowStore';
import { matchProfile, stepProfilePick, type DeskId, type ProfilePick } from '../../lib/posture/profiles';
import type { Landmarks } from '../../lib/posture/types';
import { useBaseline } from '../posture/baseline-context';

export function useGlowLearning(input: {
  landmarks: Landmarks | null;
  wallMs: number | null;
  score: number | null;
  good: boolean;
  pose: 'sitting' | 'standing';
  enabled: boolean;
}) {
  const { baseline, standing, profiles, activeProfileId, save, saveStanding, selectProfile } = useBaseline();
  const [glowAsk, setGlowAsk] = useState(false);
  const [strictAsk, setStrictAsk] = useState(false);
  const [goodPosture, setGoodPosture] = useState<'idle' | 'capturing' | 'saved'>('idle');
  const [offerDay, setOfferDay] = useState<string | null>(() => loadGlowOfferDay());
  const [great, setGreat] = useState(initialGreat);
  const [seen, setSeen] = useState<number | null>(null);
  const [pick, setPick] = useState<ProfilePick>({ id: null, sinceMs: 0 });
  const [switchTo, setSwitchTo] = useState<DeskId | null>(null);
  const recent = useRef<{ at: number; frame: Landmarks }[]>([]);
  const capture = useRef<{ until: number; frames: Landmarks[]; pose: 'sit' | 'stand'; blend: boolean } | null>(null);
  const today = todayKey();

  if (input.enabled && input.landmarks && input.wallMs !== null && input.wallMs !== seen) {
    setSeen(input.wallMs);
    const stepped = stepGreatMoment(great, { nowMs: input.wallMs, score: input.score ?? 0, good: input.good });
    if (stepped.state.steadyMs !== great.steadyMs || stepped.state.lastMs !== great.lastMs) setGreat(stepped.state);
    if (stepped.ready && offerDay !== today && !glowAsk) setGlowAsk(true);
    const view = viewOf(input.landmarks);
    if (view) {
      const nextPick = stepProfilePick(pick, matchProfile(profiles, view), input.wallMs, activeProfileId);
      if (nextPick.state.id !== pick.id || nextPick.state.sinceMs !== pick.sinceMs) setPick(nextPick.state);
      if (nextPick.switchTo && nextPick.switchTo !== switchTo) setSwitchTo(nextPick.switchTo);
    }
  }

  useEffect(() => {
    if (!input.enabled || !input.landmarks || input.wallMs === null) return;
    const at = input.wallMs;
    recent.current = [...recent.current, { at, frame: input.landmarks }].filter((item) => at - item.at <= 4_000);
    const run = capture.current;
    if (!run) return;
    run.frames.push(input.landmarks);
    if (at < run.until) return;
    capture.current = null;
    const result = medianCapture(run.frames);
    setGoodPosture(result ? 'saved' : 'idle');
    if (!result) return;
    const current = run.pose === 'stand' ? standing : baseline;
    const sample = { ...result, pose: run.pose };
    const next = run.blend && current ? blendBaseline(current, sample) : sample;
    void (run.pose === 'stand' ? saveStanding(next) : save(next));
  }, [input.enabled, input.landmarks, input.wallMs, baseline, standing, save, saveStanding]);

  useEffect(() => {
    if (!switchTo || switchTo === activeProfileId) return;
    void selectProfile(switchTo);
  }, [switchTo, activeProfileId, selectProfile]);

  function noteAlert(): void {
    const times = noteAlertDismiss(loadDismissTimes(), Date.now());
    saveDismissTimes(times);
    if (tooStrict(times) && loadStrictDay() !== today) setStrictAsk(true);
  }

  function dismissGlowOffer(): void {
    saveGlowOfferDay(today);
    setOfferDay(today);
    setGlowAsk(false);
  }

  function acceptGlow(): void {
    const pose: 'sit' | 'stand' = input.pose === 'standing' ? 'stand' : 'sit';
    const frames = recent.current.map((item) => item.frame);
    const result = medianCapture(frames);
    const current = pose === 'stand' ? standing : baseline;
    if (result) {
      const sample = { ...result, pose };
      const next = current ? blendBaseline(current, sample) : sample;
      void (pose === 'stand' ? saveStanding(next) : save(next));
      dismissGlowOffer();
      return;
    }
    capture.current = { until: Date.now() + postureConfig.glow.quickCaptureMs, frames: [], pose, blend: true };
    setGoodPosture('capturing');
    dismissGlowOffer();
  }

  function dismissStrict(): void {
    saveStrictDay(today);
    setStrictAsk(false);
  }

  function captureGoodPosture(): void {
    const pose = input.pose === 'standing' ? 'stand' : 'sit';
    capture.current = { until: Date.now() + postureConfig.glow.quickCaptureMs, frames: [], pose, blend: false };
    setGoodPosture('capturing');
  }

  return { glowAsk, acceptGlow, dismissGlowOffer, strictAsk, dismissStrict, goodPosture, captureGoodPosture, noteAlert };
}

function viewOf(landmarks: Landmarks): { ipdPx: number; noseX: number; noseY: number } | null {
  const ipd = frameSignals(landmarks).ipdPx;
  if (!landmarks.nose || !ipd || landmarks.videoWidth <= 0 || landmarks.videoHeight <= 0) return null;
  return { ipdPx: ipd, noseX: landmarks.nose.x / landmarks.videoWidth, noseY: landmarks.nose.y / landmarks.videoHeight };
}
