import { reminderOptions, snapTo } from '../reminders/config';
import { defaultSettings, strictnessFor, type AppSettings, type Sensitivity } from './defaults';

const SETTINGS_KEY = 'sitglow.settings';
export const SETTINGS_VERSION = 2;

/** Keys that older versions saved and nothing reads any more. */
const DEAD_KEYS = ['stretchMinutes', 'showOverlay', 'showBestOutline', 'waterReminders', 'spotQuiet', 'spotQuietStart', 'spotQuietEnd'] as const;

/** Saved settings from any older version. */
export type StoredSettings = Partial<AppSettings> & {
  stretchMinutes?: number;
  showOverlay?: boolean;
  showBestOutline?: boolean;
  waterReminders?: boolean;
  spotQuiet?: boolean;
  spotQuietStart?: string;
  spotQuietEnd?: string;
};

export interface SettingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSettings(storage: SettingStorage = browserStorage()): AppSettings {
  const parsed = read(storage);
  return normalize(parsed);
}

export function saveSettings(settings: AppSettings, storage: SettingStorage = browserStorage()): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(normalize(settings)));
}

export function mergeSettings(current: AppSettings, patch: Partial<AppSettings>): AppSettings {
  const next: AppSettings = { ...current, ...patch };
  if (patch.sensitivity) next.strictness = strictnessFor(patch.sensitivity);
  return normalize(next);
}

/**
 * One-time upgrade of settings saved by version 1:
 * - one quiet hours setting: the spot-check quiet hours fold into the general one;
 * - voice tips and the chime become two separate switches (they used to be linked);
 * - Sit and stand keeps auto-detect on, now that it has its own switch;
 * - dead keys are dropped (normalize removes them).
 */
export function migrateSettings(stored: StoredSettings): StoredSettings {
  const empty = Object.keys(stored).length === 0;
  const version = typeof stored.settingsVersion === 'number' ? stored.settingsVersion : empty ? SETTINGS_VERSION : 1;
  if (version >= SETTINGS_VERSION) return stored;
  const next: StoredSettings = { ...stored };
  if (stored.showLandmarks === undefined && stored.showOverlay !== undefined) next.showLandmarks = stored.showOverlay;
  if (stored.water === undefined && stored.waterReminders !== undefined) next.water = stored.waterReminders;
  if (stored.chime === undefined && stored.sound !== undefined) next.chime = stored.sound;
  // Version 1 had spot-check quiet hours on by default (6 PM to 8 AM).
  const spotQuiet = stored.spotQuiet ?? true;
  if (stored.quietHours !== true && spotQuiet) {
    next.quietHours = true;
    next.quietStart = snapClock(stored.spotQuietStart ?? '', '18:00');
    next.quietEnd = snapClock(stored.spotQuietEnd ?? '', '08:00');
  }
  if (stored.workStyle === 'mixed') next.autoDetect = true;
  next.settingsVersion = SETTINGS_VERSION;
  return next;
}

export function resetSettings(storage: SettingStorage = browserStorage()): AppSettings {
  const next = { ...defaultSettings };
  saveSettings(next, storage);
  return next;
}

export function isQuietHour(settings: AppSettings, date = new Date()): boolean {
  if (!settings.quietHours) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const start = minutesOf(settings.quietStart);
  const end = minutesOf(settings.quietEnd);
  if (start === end) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function normalize(value: StoredSettings): AppSettings {
  const migrated = migrateSettings(value);
  const next = { ...defaultSettings, ...migrated } as AppSettings & Record<string, unknown>;
  for (const key of DEAD_KEYS) delete next[key];
  if (migrated.sensitivity === undefined && migrated.strictness !== undefined && migrated.strictness !== null) {
    next.sensitivity = sensitivityFrom(migrated.strictness);
  }
  next.settingsVersion = SETTINGS_VERSION;
  next.name = typeof next.name === 'string' ? next.name.slice(0, 40) : '';
  next.strictness = strictnessFor(next.sensitivity);
  next.nudgeDelaySeconds = snapTo(next.nudgeDelaySeconds, reminderOptions.nudgeDelay) as AppSettings['nudgeDelaySeconds'];
  next.stillnessMinutes = snapStillness(next.stillnessMinutes);
  next.eyeRestMinutes = snapTo(next.eyeRestMinutes, reminderOptions.eye);
  next.waterMinutes = snapTo(next.waterMinutes, reminderOptions.water);
  next.breakMinutes = snapTo(next.breakMinutes, reminderOptions.move);
  next.standBreakMinutes = snapTo(next.standBreakMinutes, reminderOptions.standBreak);
  next.dailySwitchGoal = clamp(next.dailySwitchGoal, 1, 20);
  next.cameraMode = next.cameraMode === 'always' || next.cameraMode === 'off' ? next.cameraMode : 'spot';
  next.spotEveryMin = snapEvery(next.spotEveryMin);
  next.spotLengthSec = snapLength(next.spotLengthSec);
  next.spotWorkDays = snapDays(migrated.spotWorkDays);
  next.cameraDeviceId = typeof next.cameraDeviceId === 'string' ? next.cameraDeviceId : '';
  next.autoGuideBack = next.autoGuideBack !== false;
  next.moveBreaks = next.moveBreaks !== false;
  next.spotChecks = next.spotChecks !== false;
  next.chime = next.chime === true;
  next.quietStart = snapClock(next.quietStart, '21:00');
  next.quietEnd = snapClock(next.quietEnd, '07:00');
  next.workStart = snapClock(next.workStart, '09:00');
  next.workEnd = snapClock(next.workEnd, '18:00');
  return next;
}

function sensitivityFrom(strictness: number): Sensitivity {
  if (strictness <= 20) return 'gentle';
  if (strictness >= 80) return 'strict';
  return 'balanced';
}

function snapEvery(value: number): AppSettings['spotEveryMin'] {
  if (value <= 3) return 1;
  if (value <= 7) return 5;
  if (value <= 12) return 10;
  if (value <= 22) return 15;
  if (value <= 45) return 30;
  return 60;
}

function snapLength(value: number): AppSettings['spotLengthSec'] {
  if (value >= 18) return 20;
  if (value >= 13) return 15;
  return 10;
}

function snapDays(value: number[] | undefined): number[] {
  if (!Array.isArray(value)) return [1, 2, 3, 4, 5];
  const days = [...new Set(value.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  return days;
}

function snapClock(value: string, fallback: string): string {
  return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function snapStillness(value: number): AppSettings['stillnessMinutes'] {
  if (value <= 0) return 0;
  if (value <= 35) return 30;
  if (value <= 50) return 45;
  return 60;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function minutesOf(value: string): number {
  const [hour, minute] = value.split(':').map((part) => Number(part));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
  return hour * 60 + minute;
}

function read(storage: SettingStorage): StoredSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as StoredSettings) : {};
  } catch {
    return {};
  }
}

function browserStorage(): SettingStorage {
  return window.localStorage;
}
