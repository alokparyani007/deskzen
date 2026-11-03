import { useCallback, useEffect, useRef, useState } from 'react';
import {
  averageRest,
  baselineScore,
  breathFinished,
  chinTuckSeen,
  measureMove,
  measureRest,
  neckStretchSeen,
  scoreLooseness,
  shoulderRollDetected,
  type Looseness,
  type MoveSample,
  type RestSample,
  type RestSnapshot,
} from '../../calibration/bodyReset';
import { calibrationConfig } from '../../calibration/config';
import { extractFeatures } from '../../calibration/features';
import type { Landmarks } from '../../lib/posture/types';
import { speakCaption, stopSpeech } from '../calibrate/glowVoice';
import { BodyGuides } from './BodyGuides';
import { RESET_MOVES, previousMove } from './resetFlow';
import { saveResetMoves, type MoveMark } from './resetLog';
import { useZenChrome, useZenVoice } from './zenChrome';

const MOVE_INDEX: Record<'shoulders' | 'neck' | 'chin' | 'breath', number> = { shoulders: 0, neck: 1, chin: 2, breath: 3 };

type Phase = 'before' | 'move' | 'result';

export function ResetStep({ landmarks, onDone, onLeave }: { landmarks: Landmarks | null; onDone: () => void; onLeave: () => void }) {
  const [phase, setPhase] = useState<Phase>('move');
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<MoveMark[]>([null, null, null, null]);
  const [nice, setNice] = useState(false);
  const [patient, setPatient] = useState(false);
  const [sides, setSides] = useState({ left: false, right: false });
  const { voice } = useZenVoice();
  const [reduced, setReduced] = useState(false);
  const [before, setBefore] = useState<RestSnapshot | null>(null);
  const [after, setAfter] = useState<RestSnapshot | null>(null);
  const [retried, setRetried] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [breathMs, setBreathMs] = useState<number | null>(null);
  const [moveFraction, setMoveFraction] = useState(0);
  const landmarksRef = useRef<Landmarks | null>(null);
  const marksRef = useRef(marks);
  const beforeRef = useRef(before);
  const afterRef = useRef(after);
  const onDoneRef = useRef(onDone);
  const closed = useRef(false);
  const restsRef = useRef<RestSample[]>([]);
  const actions = useRef({ next: () => {}, back: () => {}, finish: () => {} });
  const finishRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    landmarksRef.current = landmarks;
  }, [landmarks]);
  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);
  useEffect(() => {
    beforeRef.current = before;
  }, [before]);
  useEffect(() => {
    afterRef.current = after;
  }, [after]);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const caption = phase === 'move' ? RESET_MOVES[index]!.title : '';

  useEffect(() => {
    if (!voice || !caption) return;
    speakCaption(caption, false);
    return () => stopSpeech();
  }, [caption, voice, index, phase]);

  const advance = useCallback((kind: MoveMark) => {
    const next = marksRef.current.map((item, itemIndex) => (itemIndex === index ? kind : item));
    marksRef.current = next;
    setMarks(next);
    setNice(false);
    setPatient(false);
    setSides({ left: false, right: false });
    if (retrying) {
      setRetrying(false);
      setRetried(true);
      setPhase('result');
      return;
    }
    if (index >= RESET_MOVES.length - 1) finishRef.current();
    else setIndex(index + 1);
  }, [index, retrying]);

  const goNext = useCallback(() => {
    if (phase === 'before') {
      const shot = averageRest(restsRef.current);
      if (shot) setBefore(shot);
      setPhase('move');
      return;
    }
    if (phase !== 'move') return;
    advance(nice ? 'seen' : 'skipped');
  }, [advance, nice, phase]);

  const goBack = useCallback(() => {
    if (phase === 'result' || retrying) {
      setRetrying(false);
      setPhase('move');
      setIndex(retrying ? index : RESET_MOVES.length - 1);
      return;
    }
    if (phase !== 'move') return;
    if (index === 0) {
      onLeave();
      return;
    }
    setIndex(previousMove(index));
    setNice(false);
    setPatient(false);
  }, [index, onLeave, phase, retrying]);

  useEffect(() => {
    if (!nice || phase !== 'move') return;
    const id = window.setTimeout(() => advance('seen'), 500);
    return () => window.clearTimeout(id);
  }, [advance, nice, phase]);

  useEffect(() => {
    const started = Date.now();
    const moves: MoveSample[] = [];
    const rests: RestSample[] = [];
    restsRef.current = rests;
    let phaseNow: 'run' | 'got' = 'run';
    let warned = false;
    const id = window.setInterval(() => {
      if (closed.current || phaseNow === 'got') return;
      const elapsedMs = Date.now() - started;
      const frame = landmarksRef.current;
      const move = frame ? measureMove(frame, elapsedMs) : null;
      const rest = frame ? measureRest(frame, elapsedMs) : null;
      if (move) moves.push(move);
      if (rest) rests.push(rest);

      if (phase === 'before') return;

      if (phase === 'result') {
        const shot = averageRest(rests);
        if (shot) setAfter(shot);
        return;
      }

      if (index === 3) setBreathMs(elapsedMs);
      if (phase === 'move') setMoveFraction(Math.min(1, elapsedMs / 4_000));
      if (phase === 'move' && elapsedMs >= 4_000) {
        phaseNow = 'got';
        setNice(true);
        return;
      }
      if (index === 1) {
        const neck = neckStretchSeen(moves);
        setSides({ left: neck.left, right: neck.right });
      }
      const seen = index === 0 ? shoulderRollDetected(moves) : index === 1 ? neckStretchSeen(moves).done : index === 2 ? chinTuckSeen(moves) : breathFinished(elapsedMs);
      if (seen) {
        phaseNow = 'got';
        setNice(true);
        return;
      }
      if (!warned && elapsedMs >= calibrationConfig.bodyReset.moveTimeoutMs) {
        warned = true;
        setPatient(true);
      }
    }, calibrationConfig.bodyReset.sampleMs);
    return () => {
      window.clearInterval(id);
    };
  }, [advance, index, phase]);

  function finish() {
    if (closed.current) return;
    closed.current = true;
    stopSpeech();
    const prior = beforeRef.current;
    const later = afterRef.current;
    const scored = prior && later ? scoreLooseness(prior, later) : null;
    const liveFrame = landmarksRef.current;
    const forwardHead = liveFrame ? extractFeatures({ landmarks: liveFrame }).internal.forwardHead : undefined;
    saveResetMoves(marksRef.current, {
      before: prior ? baselineScore(prior) : null,
      after: scored ? scored.score : null,
      shoulderGap: later ? later.shoulderGap : null,
      shoulderY: later?.shoulderY ?? null,
      faceRatio: later?.faceRatio ?? null,
      forwardHead: forwardHead ?? null,
    });
    onDoneRef.current();
  }
  finishRef.current = finish;

  function retry(looseness: Looseness) {
    if (!looseness.retry) return;
    setRetrying(true);
    setRetried(false);
    setNice(false);
    setPatient(false);
    setIndex(MOVE_INDEX[looseness.retry]);
    setPhase('move');
  }

  const looseness = before && after ? scoreLooseness(before, after) : null;
  const move = RESET_MOVES[index]!;
  const loose = looseness !== null && looseness.score >= calibrationConfig.bodyReset.looseScore;
  const title = phase === 'result'
    ? (loose ? "You're loose and ready" : looseness?.message ?? 'Sit normally for a moment.')
    : nice && phase === 'move'
      ? 'Nice!'
      : phase === 'before'
        ? "Let's see how tense you are"
        : move.title;
  const helper = phase === 'result'
    ? 'Measured on this device. No video saved.'
    : patient
      ? "No worries, that's fine. Tap Next."
      : phase === 'before'
        ? 'Just sit normally.'
        : move.caption;
  actions.current = {
    next: () => {
      if (phase === 'result') {
        if (!loose && !retried && looseness?.retry) retry(looseness);
        else finish();
      } else if (phase === 'move') finishRef.current();
      else goNext();
    },
    back: () => {
      if (phase === 'before') onLeave();
      else goBack();
    },
    finish,
  };
  useZenChrome({
    title,
    helper,
    countdown: null,
    holdFraction: phase === 'move' ? moveFraction : 0,
    nextLabel: 'Next',
    backLabel: 'Back',
    showCard: true,
    showNav: true,
    locking: false,
    pulseNext: patient,
    kicker: phase === 'move' ? `Move ${index + 1} of 4` : null,
    icon: move.kind,
    onBack: () => actions.current.back(),
    onNext: () => actions.current.next(),
  });

  return (
    <>
      <BodyGuides landmarks={landmarks} hot={nice || phase === 'result'} showArrow={false} breathElapsed={phase === 'move' && move.kind === 'breath' && !nice ? breathMs : null} reduced={reduced} />
      {phase === 'move' && move.kind === 'neck' ? (
        <div className="absolute right-4 top-4 flex gap-2">
          <span className={`rounded-full border border-white/15 px-3 py-1 text-sm font-semibold backdrop-blur-md ${sides.left ? 'bg-print text-white' : 'bg-slate-900/70 text-white'}`}>Left</span>
          <span className={`rounded-full border border-white/15 px-3 py-1 text-sm font-semibold backdrop-blur-md ${sides.right ? 'bg-print text-white' : 'bg-slate-900/70 text-white'}`}>Right</span>
        </div>
      ) : null}
    </>
  );
}
