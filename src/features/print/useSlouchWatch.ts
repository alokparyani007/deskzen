import { useEffect, useRef, useState } from 'react';
import { slouchAmount } from '../../calibration/catchMe';
import {
  holdComplete,
  holdCountdown,
  meterFromAmount,
  showSlouchFallback,
  skipCatchResult,
  slouchCaptureDecision,
  SLOUCH_DONE_MS,
  SLOUCH_FALLBACK_MS,
  SLOUCH_HOLD_MS,
  slouchStatusLine,
  smoothMeter,
} from '../../calibration/catchMeter';
import { calibrationConfig } from '../../calibration/config';
import type { FeatureBundle } from '../../calibration/print';
import type { Landmarks } from '../../lib/posture/types';
import { speakCaption } from '../calibrate/glowVoice';

const MUTE_KEY = 'sitglow.glowMuted';

export type SlouchStatus = 'out' | 'more' | 'hold' | 'done';

export function personInFrame(frame: Landmarks | null): boolean {
  if (!frame || frame.videoWidth <= 0) return false;
  const nose = frame.nose;
  const face = Boolean(nose && (nose.visibility === undefined || nose.visibility >= 0.5)) || Boolean(frame.leftEye || frame.rightEye);
  return face && Boolean(frame.leftShoulder && frame.rightShoulder);
}

export function useSlouchWatch(
  landmarks: Landmarks | null,
  anchor: FeatureBundle | null,
  onCaught: (frames: Landmarks[], detected: boolean) => void,
): {
  meter: number;
  status: SlouchStatus;
  line: string;
  countdown: 2 | 1 | null;
  holdFraction: number;
  showFallback: boolean;
  skip: () => void;
  acceptPeak: () => void;
} {
  const [meter, setMeter] = useState(0);
  const [status, setStatus] = useState<SlouchStatus>('more');
  const [countdown, setCountdown] = useState<2 | 1 | null>(null);
  const [holdFraction, setHoldFraction] = useState(0);
  const [showFallback, setShowFallback] = useState(false);
  const landmarksRef = useRef(landmarks);
  const onCaughtRef = useRef(onCaught);
  const peakRef = useRef<Landmarks[]>([]);
  const recentRef = useRef<Landmarks[]>([]);
  const meterRef = useRef(0);
  const heldRef = useRef<Landmarks[]>([]);
  const done = useRef(false);

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);
  useEffect(() => {
    onCaughtRef.current = onCaught;
  }, [onCaught]);

  useEffect(() => {
    if (!anchor) return;
    const target = calibrationConfig.catchMe.slouchAmount;
    const started = Date.now();
    let last = started;
    let smooth: number | null = null;
    let heldMs = 0;
    let bestAmount = -1;
    const peak: Landmarks[] = [];
    const recent: Landmarks[] = [];
    const held: Landmarks[] = [];
    let said = false;
    let finishTimer = 0;
    const id = window.setInterval(() => {
      if (done.current) return;
      const now = Date.now();
      const dt = Math.min(250, Math.max(0, now - last));
      last = now;
      const elapsed = now - started;
      const frame = landmarksRef.current;
      const visible = personInFrame(frame);
      if (visible && frame) {
        const raw = slouchAmount(frame, anchor);
        smooth = smoothMeter(smooth, meterFromAmount(raw, target));
        setMeter(smooth);
        recent.push(frame);
        if (recent.length > 12) recent.shift();
        if (raw > bestAmount) {
          bestAmount = raw;
          peak.length = 0;
          peak.push(frame);
        } else if (bestAmount >= 0 && raw >= bestAmount * 0.9) {
          peak.push(frame);
          if (peak.length > 12) peak.shift();
        }
        const shownMeter = meterFromAmount(raw, target);
        if (shownMeter >= 0.4) {
          heldMs += dt;
          held.push(frame);
          if (held.length > 40) held.shift();
        } else heldMs = 0;
      } else heldMs = 0;
      peakRef.current = peak.slice();
      recentRef.current = recent.slice();
      meterRef.current = smooth ?? 0;
      heldRef.current = held.slice();
      const finished = holdComplete(heldMs);
      const holding = heldMs > 0 && !finished;
      setHoldFraction(Math.min(1, heldMs / SLOUCH_HOLD_MS));
      setShowFallback(showSlouchFallback(elapsed, holding, finished));
      if (!finished && !holding && elapsed >= SLOUCH_FALLBACK_MS && (smooth ?? 0) < 0.25) {
        done.current = true;
        onCaughtRef.current([], false);
        return;
      }
      if (finished) {
        setStatus('done');
        setCountdown(null);
        done.current = true;
        const saved = held.slice();
        const fallback = peak.slice();
        finishTimer = window.setTimeout(() => {
          onCaughtRef.current(saved.length > 0 ? saved : fallback, true);
        }, SLOUCH_DONE_MS);
        return;
      }
      if (!visible) {
        setStatus('out');
        setCountdown(null);
        return;
      }
      if (holding) {
        setStatus('hold');
        setCountdown(holdCountdown(heldMs));
        return;
      }
      setStatus('more');
      setCountdown(null);
      if (!said && window.localStorage.getItem(MUTE_KEY) !== '1') {
        said = true;
        speakCaption('Slump a bit more', false, 1);
      }
    }, calibrationConfig.catchMe.sampleMs);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(finishTimer);
    };
  }, [anchor]);

  function skip() {
    if (done.current) return;
    done.current = true;
    const skipped = skipCatchResult();
    onCaughtRef.current(skipped.frames, skipped.detected);
  }

  function acceptPeak() {
    if (done.current) return;
    done.current = true;
    const latest = landmarksRef.current;
    const captured = latest && personInFrame(latest) ? [latest] : recentRef.current.slice(-1);
    const decision = slouchCaptureDecision({ source: 'button', meter: meterRef.current, frameCount: captured.length });
    onCaughtRef.current(decision.detected ? captured : [], decision.detected);
  }

  return {
    meter,
    status,
    line: slouchStatusLine(status),
    countdown,
    holdFraction,
    showFallback,
    skip,
    acceptPeak,
  };
}
