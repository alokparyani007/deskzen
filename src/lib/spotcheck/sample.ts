import { readSignals, type MotionMemory } from '../posture/readSignals';
import { scoreFrame } from '../posture/score';
import { initialStandingWatch, standingFrame } from '../posture/standing';
import type { Baseline, Landmarks, SignalKey } from '../posture/types';
import type { SpotFrame, SpotIssue } from './verdict';

export function scoreSpotFrame(landmarks: Landmarks, baseline: Baseline, posture: 'sitting' | 'standing', motion: MotionMemory = { movingUntilMs: 0 }): { frame: SpotFrame; motion: MotionMemory } {
  if (!landmarks.nose || landmarks.faceCount === 0) {
    return { frame: { present: false, score: 0, issue: null }, motion };
  }
  if (posture === 'standing') {
    const stood = standingFrame(landmarks, baseline, null, 0, initialStandingWatch(), false);
    return { frame: { present: true, score: stood.raw, issue: standingIssue(stood.issue) }, motion };
  }
  const sensed = readSignals(landmarks, baseline, motion);
  if (sensed.readings.quality !== 'good') return { frame: { present: false, score: 0, issue: null }, motion: sensed.motion };
  const scored = scoreFrame(sensed.readings, undefined, 0, 1);
  return { frame: { present: true, score: scored.smoothed, issue: sittingIssue(scored.dominantIssue) }, motion: sensed.motion };
}

function sittingIssue(issue: SignalKey | undefined): SpotIssue | null {
  if (issue === 'lean' || issue === 'headDrop' || issue === 'shoulders' || issue === 'distance') return issue;
  if (issue === 'tilt') return 'shoulders';
  return null;
}

function standingIssue(issue: SignalKey | undefined): SpotIssue | null {
  if (issue === 'tilt') return 'hipLean';
  if (issue === 'lean' || issue === 'headDrop' || issue === 'shoulders' || issue === 'distance') return issue;
  return null;
}
