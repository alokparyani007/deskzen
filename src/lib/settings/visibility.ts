import type { AppSettings, WorkStyle } from './defaults';
import { strictnessFor } from './defaults';

export interface StyleFeatures {
  standingSection: boolean;
  intervalSection: boolean;
  sittingCalibration: boolean;
  standingCalibration: boolean;
  hipLean: boolean;
  elbow: boolean;
  stillness: boolean;
  sittingBreaks: boolean;
  standBreaks: boolean;
}

export function featuresFor(style: WorkStyle): StyleFeatures {
  if (style === 'sit') {
    return {
      standingSection: false,
      intervalSection: false,
      sittingCalibration: true,
      standingCalibration: false,
      hipLean: false,
      elbow: false,
      stillness: false,
      sittingBreaks: true,
      standBreaks: false,
    };
  }
  if (style === 'stand') {
    return {
      standingSection: true,
      intervalSection: false,
      sittingCalibration: false,
      standingCalibration: true,
      hipLean: true,
      elbow: true,
      stillness: true,
      sittingBreaks: false,
      standBreaks: true,
    };
  }
  return {
    standingSection: true,
    intervalSection: true,
    sittingCalibration: true,
    standingCalibration: true,
    hipLean: true,
    elbow: true,
    stillness: true,
    sittingBreaks: true,
    standBreaks: true,
  };
}

/** First posture that still needs a baseline, or null when this style is ready. */
export function calibrationNeeded(style: WorkStyle, sittingSaved: boolean, standingSaved: boolean): 'sit' | 'stand' | null {
  const features = featuresFor(style);
  if (features.sittingCalibration && !sittingSaved) return 'sit';
  if (features.standingCalibration && !standingSaved) return 'stand';
  return null;
}

export function calibrationStepLabel(style: WorkStyle, pose: 'sit' | 'stand'): string | null {
  if (style !== 'mixed') return null;
  return pose === 'sit' ? '1 of 2' : '2 of 2';
}

export function styleLabel(style: WorkStyle): string {
  if (style === 'sit') return 'Sit only';
  if (style === 'stand') return 'Stand only';
  return 'Sit and stand';
}

export function styleChangeCopy(style: WorkStyle): string {
  return `Switch to ${styleLabel(style)}? We'll set up any posture you haven't saved yet.`;
}

export function applyWorkStyle(current: AppSettings, style: WorkStyle): AppSettings {
  if (style === current.workStyle) return current;
  if (style === 'sit') {
    return { ...current, workStyle: 'sit', intervalsOn: false, autoDetect: false };
  }
  if (style === 'stand') {
    return {
      ...current,
      workStyle: 'stand',
      intervalsOn: false,
      autoDetect: false,
      stillnessMinutes: current.stillnessMinutes === 0 ? 45 : current.stillnessMinutes,
      standBreakMinutes: current.standBreakMinutes || 40,
    };
  }
  return { ...current, workStyle: 'mixed', intervalsOn: true, autoDetect: true };
}

export function resolvedPosture(style: WorkStyle, detected: 'sitting' | 'standing'): 'sitting' | 'standing' {
  if (style === 'stand') return 'standing';
  if (style === 'sit') return 'sitting';
  return detected;
}

export function sensitivityPatch(sensitivity: AppSettings['sensitivity']): Pick<AppSettings, 'sensitivity' | 'strictness'> {
  return { sensitivity, strictness: strictnessFor(sensitivity) };
}
