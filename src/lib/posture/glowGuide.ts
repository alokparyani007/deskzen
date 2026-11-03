import { postureConfig } from './config';

export type GuideStepId = 'settle' | 'shoulders' | 'chin' | 'breathe';

export interface GuideStep {
  id: GuideStepId;
  caption: string;
  startMs: number;
  endMs: number;
}

export const SIT_LINE = 'Sit back into your chair, feet flat.';
export const STAND_LINE = 'Stand with your feet hip-width, weight over both feet.';
export const SHOULDER_LINE = 'Roll your shoulders up, back, and let them drop.';
export const CHIN_LINE = 'Gently slide your chin back, like making a double chin.';
export const BREATHE_LINE = 'Breathe in... and out. Perfect, hold that.';

export function guidePlan(pose: 'sit' | 'stand', totalMs: number = postureConfig.glow.guideMs): GuideStep[] {
  const captureStart = Math.max(0, totalMs - postureConfig.glow.captureMs);
  const breatheStart = Math.max(0, captureStart - 4_000);
  const slice = breatheStart / 3;
  return [
    { id: 'settle', caption: pose === 'stand' ? STAND_LINE : SIT_LINE, startMs: 0, endMs: slice },
    { id: 'shoulders', caption: SHOULDER_LINE, startMs: slice, endMs: slice * 2 },
    { id: 'chin', caption: CHIN_LINE, startMs: slice * 2, endMs: breatheStart },
    { id: 'breathe', caption: BREATHE_LINE, startMs: breatheStart, endMs: totalMs },
  ];
}

export function planFor(mode: 'full' | 'tune' | 'check' | 'recheck', pose: 'sit' | 'stand'): { steps: GuideStep[]; totalMs: number } {
  if (mode === 'check') {
    const totalMs = postureConfig.calibration.checkMs;
    return { totalMs, steps: [{ id: 'breathe', caption: BREATHE_LINE, startMs: 0, endMs: totalMs }] };
  }
  if (mode === 'recheck') {
    const totalMs = postureConfig.glow.recheckMs;
    return { totalMs, steps: [{ id: 'breathe', caption: BREATHE_LINE, startMs: 0, endMs: totalMs }] };
  }
  const totalMs = mode === 'tune' ? postureConfig.glow.tuneMs : postureConfig.glow.guideMs;
  return { totalMs, steps: guidePlan(pose, totalMs) };
}

export function guideAt(elapsedMs: number, steps: GuideStep[], totalMs: number, captureMs: number): {
  step: GuideStep;
  capturing: boolean;
  speechDone: boolean;
} {
  const elapsed = Math.max(0, elapsedMs);
  const step = steps.find((item) => elapsed < item.endMs) ?? steps[steps.length - 1]!;
  return {
    step,
    capturing: elapsed >= totalMs - captureMs,
    speechDone: elapsed >= totalMs,
  };
}
