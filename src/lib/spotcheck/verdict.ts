import { median } from '../posture/baseline';

export type SpotIssue = 'lean' | 'headDrop' | 'shoulders' | 'distance' | 'hipLean';
export type SpotOutcome = 'good' | 'fix' | 'away';

export interface SpotFrame {
  present: boolean;
  score: number;
  issue: SpotIssue | null;
}

export interface SpotVerdict {
  outcome: SpotOutcome;
  score: number | null;
  issue: SpotIssue | null;
}

/** Median Glow Score of the frames where a person was seen. Away when the chair is empty. */
export function verdictFromFrames(frames: SpotFrame[], threshold: number): SpotVerdict {
  if (frames.length === 0) return { outcome: 'away', score: null, issue: null };
  const present = frames.filter((frame) => frame.present);
  if (present.length / frames.length < 0.5) return { outcome: 'away', score: null, issue: null };
  const score = median(present.map((frame) => frame.score));
  if (score >= threshold) return { outcome: 'good', score, issue: null };
  return { outcome: 'fix', score, issue: mainIssue(present) };
}

export function mainIssue(frames: SpotFrame[]): SpotIssue | null {
  const counts = new Map<SpotIssue, number>();
  for (const frame of frames) {
    if (!frame.issue) continue;
    counts.set(frame.issue, (counts.get(frame.issue) ?? 0) + 1);
  }
  let best: SpotIssue | null = null;
  let bestCount = 0;
  for (const [issue, count] of counts) {
    if (count > bestCount) {
      best = issue;
      bestCount = count;
    }
  }
  return best;
}

export function spotAlertCopy(issue: SpotIssue | null, inches = 3): string {
  const back = Math.max(1, Math.round(inches));
  if (issue === 'lean') return `Posture check: you're leaning in. Ease back about ${back} in.`;
  if (issue === 'headDrop') return 'Posture check: your head has dropped. Lift your chin a touch.';
  if (issue === 'shoulders') return 'Posture check: let your shoulders drop.';
  if (issue === 'distance') return `Posture check: you're too close to the screen. Ease back about ${back} in.`;
  if (issue === 'hipLean') return 'Posture check: bring your weight back over both feet.';
  return "Posture check: sit tall, you've got this.";
}

export function alertPlan(outcome: SpotOutcome): { toast: string | null; notify: boolean } {
  if (outcome === 'good') return { toast: 'Looking good', notify: false };
  if (outcome === 'fix') return { toast: null, notify: true };
  return { toast: null, notify: false };
}
