import type { WorkStyle } from '../../lib/settings/defaults';
import type { PoseMode } from './zenConfig';

const ZEN_MODE_KEY = 'sitglow.zenMode';

export interface ModeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Remember the mode Set my Zen just saved. Numbers only, on this device. */
export function rememberZenMode(mode: PoseMode, storage: ModeStorage | null = browserStorage()): void {
  try {
    storage?.setItem(ZEN_MODE_KEY, mode);
  } catch {
    // Private mode or a full disk. The print still stores the mode.
  }
}

export function rememberedZenMode(storage: ModeStorage | null = browserStorage()): PoseMode | null {
  try {
    const value = storage?.getItem(ZEN_MODE_KEY);
    return value === 'stand' || value === 'sit' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Which Zen Live view should load.
 * Mixed follows the current posture. Sit-only and stand-only lock that posture to the
 * work style, so a Standing Zen would otherwise open as Sitting. The saved mode wins.
 */
export function liveRequestMode(input: { workStyle: WorkStyle; sessionMode: PoseMode; remembered: PoseMode | null }): PoseMode {
  if (input.workStyle === 'mixed') return input.sessionMode;
  return input.remembered ?? input.sessionMode;
}

/** Label and tips follow the Zen that was actually loaded, including the only-print fallback. */
export function liveDisplayMode(
  print: { mode?: string | null; zen?: { mode?: string | null } | null } | null,
  requested: PoseMode,
): PoseMode {
  const zenMode = print?.zen?.mode;
  if (zenMode === 'stand' || zenMode === 'sit') return zenMode;
  if (print?.mode === 'stand' || print?.mode === 'sit') return print.mode;
  return requested;
}

function browserStorage(): ModeStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
