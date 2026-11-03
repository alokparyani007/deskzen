import type { CoachDrift } from './coach';

export type GuideStepId = 'sit' | 'shoulders' | 'chin';
export type MoveCue = 'up' | 'back' | 'left' | 'right' | 'down';

export interface GuideReady {
  sit: boolean;
  shoulders: boolean;
  chin: boolean;
}

export interface GuideAmounts {
  slouch: number;
  lean: number;
  tooClose: number;
  shouldersUp: number;
  shouldersTilt: number;
  headForward: number;
  headDown: number;
}

export interface GuideMemory {
  phase: 'idle' | 'step' | 'done';
  step: GuideStepId;
  holdMs: number;
  lastAt: number;
  skip: Partial<Record<GuideStepId, true>>;
  done: Partial<Record<GuideStepId, true>>;
  spoken: GuideStepId | 'done' | null;
}

export interface GuideResult {
  memory: GuideMemory;
  speak: string | null;
  chime: boolean;
  bounce: boolean;
  skipped: GuideStepId[];
}

export interface GuideMark {
  sit: 'wait' | 'current' | 'done' | 'skip';
  shoulders: 'wait' | 'current' | 'done' | 'skip';
  chin: 'wait' | 'current' | 'done' | 'skip';
}

const ORDER: GuideStepId[] = ['chin', 'shoulders', 'sit'];
const HOLD_MS = 1_500;

export const GUIDE_DONE = "You're back in your Zen";
export const GUIDE_DONE_HELP = 'Hold that easy posture.';

export function emptyGuide(): GuideMemory {
  return { phase: 'idle', step: 'sit', holdMs: 0, lastAt: 0, skip: {}, done: {}, spoken: null };
}

/** A step is ready when those drifts are inside the Posture Print range. */
export function guideReady(amounts: GuideAmounts): GuideReady {
  return {
    sit: amounts.slouch < 1 && amounts.lean < 1 && amounts.tooClose < 1,
    shoulders: amounts.shouldersUp < 1 && amounts.shouldersTilt < 1,
    chin: amounts.headForward < 1 && amounts.headDown < 1,
  };
}

export function guideLine(step: GuideStepId, standing: boolean): { title: string; helper: string } {
  if (step === 'sit') {
    return standing
      ? { title: 'Stand tall', helper: 'Lengthen through your spine.' }
      : { title: 'Sit back in your chair', helper: 'Let the chair support you.' };
  }
  if (step === 'shoulders') return { title: 'Drop your shoulders', helper: 'Let them sink away from your ears.' };
  return { title: 'Ease your head back', helper: 'Ears over shoulders, chin level.' };
}

export function guideProgress(memory: GuideMemory): { step: number; total: number } | null {
  if (memory.phase !== 'step') return null;
  const active = ORDER.filter((id) => !memory.skip[id]);
  const index = active.indexOf(memory.step);
  if (index < 0 || active.length === 0) return null;
  return { step: index + 1, total: active.length };
}

export function guideMarks(memory: GuideMemory): GuideMark {
  return { sit: mark(memory, 'sit'), shoulders: mark(memory, 'shoulders'), chin: mark(memory, 'chin') };
}

export function moveCue(input: { guideStep: GuideStepId | null; drift: CoachDrift | null; percent: number | null }): MoveCue | null {
  if (input.guideStep === 'sit') return 'back';
  if (input.guideStep === 'shoulders') return 'down';
  if (input.guideStep === 'chin') return 'up';
  if (input.percent !== null && input.percent >= 90) return null;
  switch (input.drift) {
    case 'head-down':
      return 'up';
    case 'head-forward':
    case 'slouch':
    case 'chin-slouch':
    case 'too-close':
      return 'back';
    case 'lean-left':
      return 'left';
    case 'lean-right':
      return 'right';
    case 'shoulders-up':
      return 'down';
    default:
      return null;
  }
}

export function shouldAutoGuide(input: { enabled: boolean; used: boolean; guiding: boolean; offSince: number | null; now: number; match: number | null }): boolean {
  if (!input.enabled || input.used || input.guiding || input.offSince === null) return false;
  if (input.match === null || input.match >= 70) return false;
  return input.now - input.offSince >= 30_000;
}

export function startGuide(now: number, ready: GuideReady, standing: boolean): GuideResult {
  return enter({ ...emptyGuide(), lastAt: now }, ORDER[0] ?? 'chin', now, ready, standing);
}

export function stepGuide(memory: GuideMemory, now: number, ready: GuideReady, standing: boolean): GuideResult {
  if (memory.phase !== 'step') return { memory, speak: null, chime: false, bounce: false, skipped: [] };
  if (!ready[memory.step]) {
    return { memory: { ...memory, holdMs: 0, lastAt: now }, speak: null, chime: false, bounce: false, skipped: [] };
  }
  const dt = Math.min(HOLD_MS, Math.max(0, now - memory.lastAt));
  const holdMs = memory.holdMs + dt;
  if (holdMs < HOLD_MS) {
    return { memory: { ...memory, holdMs, lastAt: now }, speak: null, chime: false, bounce: false, skipped: [] };
  }
  const done = { ...memory.done, [memory.step]: true };
  const entered = enter({ ...memory, done, lastAt: now }, nextStep(memory.step), now, ready, standing);
  return { ...entered, chime: true };
}

function enter(base: GuideMemory, step: GuideStepId | null, now: number, ready: GuideReady, standing: boolean): GuideResult {
  const skipped: GuideStepId[] = [];
  const memory: GuideMemory = { ...base, skip: { ...base.skip }, done: { ...base.done } };
  let cursor = step;
  while (cursor && ready[cursor]) {
    memory.skip[cursor] = true;
    skipped.push(cursor);
    cursor = nextStep(cursor);
  }
  if (!cursor) {
    return {
      memory: { ...memory, phase: 'done', lastAt: now, holdMs: 0, spoken: 'done' },
      speak: GUIDE_DONE,
      chime: false,
      bounce: true,
      skipped,
    };
  }
  return {
    memory: { ...memory, phase: 'step', step: cursor, holdMs: 0, lastAt: now, spoken: cursor },
    speak: memory.spoken === cursor ? null : guideLine(cursor, standing).title,
    chime: false,
    bounce: false,
    skipped,
  };
}

function nextStep(step: GuideStepId): GuideStepId | null {
  return ORDER[ORDER.indexOf(step) + 1] ?? null;
}

function mark(memory: GuideMemory, id: GuideStepId): GuideMark['sit'] {
  if (memory.skip[id]) return 'skip';
  if (memory.done[id]) return 'done';
  if (memory.phase === 'done') return 'done';
  if (memory.phase === 'step' && memory.step === id) return 'current';
  return 'wait';
}
