import { useEffect, useRef, useState } from 'react';
import { canSpeak, emptySetupHold, setupCheck, type LightSample, type SetupHold, type SpeakClock } from '../../calibration/setupCheck';
import type { LightingRead } from './lighting';
import type { Landmarks } from '../../lib/posture/types';
import { speakCaption, stopSpeech } from '../calibrate/glowVoice';
import { frameChecklist } from './frameCoach';
import { PostureGuide } from './PostureGuide';
import { useZenChrome, useZenVoice } from './zenChrome';

export function SetupStep({
  landmarks,
  light,
  onContinue,
  onBack,
}: {
  landmarks: Landmarks | null;
  light?: LightSample;
  lighting: LightingRead;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [held, setHeld] = useState<SetupHold>(emptySetupHold);
  const [seen, setSeen] = useState<{ landmarks: Landmarks | null; light?: LightSample }>({ landmarks, light });
  if (seen.landmarks !== landmarks || seen.light !== light) {
    setSeen({ landmarks, light });
    setHeld(setupCheck(landmarks, light, held).hold);
  }
  const checklist = frameChecklist(landmarks, light);
  const { voice } = useZenVoice();
  const speakRef = useRef<SpeakClock>({ line: null, atMs: 0 });
  const gone = useRef(false);
  const continueRef = useRef(onContinue);
  continueRef.current = onContinue;

  useEffect(() => () => stopSpeech(), []);

  useEffect(() => {
    if (!voice) return;
    const now = Date.now();
    if (!canSpeak(checklist.voice, now, speakRef.current)) return;
    speakRef.current = { line: checklist.voice, atMs: now };
    speakCaption(checklist.voice, false, 1);
  }, [checklist.voice, voice]);

  useEffect(() => {
    if (!checklist.ready) return;
    const id = window.setTimeout(() => {
      if (gone.current) return;
      gone.current = true;
      stopSpeech();
      continueRef.current();
    }, 2_500);
    return () => window.clearTimeout(id);
  }, [checklist.ready]);

  function leave() {
    if (!checklist.ready || gone.current) return;
    gone.current = true;
    stopSpeech();
    onContinue();
  }

  useZenChrome({
    title: checklist.title,
    helper: checklist.helper,
    countdown: null,
    holdFraction: 0,
    nextLabel: 'Next',
    backLabel: 'Back',
    showCard: true,
    showNav: true,
    locking: false,
    icon: checklist.ready ? 'check' : 'person',
    chips: checklist.chips,
    nextDisabled: !checklist.ready,
    onBack,
    onNext: leave,
  });

  return <PostureGuide solid={checklist.ready} />;
}
