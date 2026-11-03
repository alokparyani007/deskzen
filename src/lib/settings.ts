export { defaultSettings, strictnessFor } from './settings/defaults';
export type { AppSettings, IntervalPreset, Sensitivity, WorkStyle } from './settings/defaults';
export { isQuietHour, loadSettings, mergeSettings, resetSettings, saveSettings } from './settings/store';
export {
  applyWorkStyle,
  calibrationNeeded,
  calibrationStepLabel,
  featuresFor,
  resolvedPosture,
  styleChangeCopy,
  styleLabel,
} from './settings/visibility';

import { initialAdaptiveState, type AdaptiveState } from './posture/adaptive';

const ADAPTIVE_KEY = 'sitglow.adaptive';

/** Older callers map a 0–100 slider onto the nudge threshold. */
export function thresholdFromStrictness(value: number): number {
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(50 + (clamped / 100) * 25);
}

export function strictnessFromThreshold(threshold: number): number {
  return Math.round(((Math.min(75, Math.max(50, threshold)) - 50) / 25) * 100);
}

export function loadAdaptive(): AdaptiveState {
  return { ...initialAdaptiveState(), ...readAdaptive() };
}

export function saveAdaptive(state: AdaptiveState): void {
  window.localStorage.setItem(ADAPTIVE_KEY, JSON.stringify(state));
}

function readAdaptive(): Partial<AdaptiveState> {
  try {
    const raw = window.localStorage.getItem(ADAPTIVE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Partial<AdaptiveState>) : {};
  } catch {
    return {};
  }
}
