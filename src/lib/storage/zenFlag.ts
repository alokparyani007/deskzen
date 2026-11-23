import { loadRecord } from './local-data';
import { PRINTS_RECORD_KEY } from '../../calibration/print';

/** Local flag so the home page can offer Live view without waiting on IndexedDB. */
export const ZEN_SAVED_KEY = 'deskzen.zen.saved';

type Memory = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function memory(): Memory | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** True when this device has a Set my Zen outline (numbers only, never a photo). */
export function libraryHasZen(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const prints = (value as { prints?: unknown }).prints;
  if (!Array.isArray(prints)) return false;
  return prints.some((item) => {
    if (!item || typeof item !== 'object') return false;
    const zen = (item as { zen?: unknown }).zen;
    if (!zen || typeof zen !== 'object') return false;
    return (zen as { version?: unknown }).version === 3;
  });
}

export function readZenSavedFlag(storage: Memory | null = memory()): boolean {
  try {
    return storage?.getItem(ZEN_SAVED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markZenSaved(storage: Memory | null = memory()): void {
  try {
    storage?.setItem(ZEN_SAVED_KEY, '1');
  } catch {
    // The outline is already in IndexedDB. The home button can catch up.
  }
}

export function clearZenSavedFlag(storage: Memory | null = memory()): void {
  try {
    storage?.removeItem(ZEN_SAVED_KEY);
  } catch {
    // Leaving the flag is harmless. The next visit checks IndexedDB.
  }
}

/** saved: a Zen outline is on this device. none: checked and empty. unknown: storage failed. */
export async function detectSavedZen(): Promise<'saved' | 'none' | 'unknown'> {
  try {
    if (typeof indexedDB === 'undefined') return 'unknown';
    const value = await loadRecord(PRINTS_RECORD_KEY);
    return libraryHasZen(value) ? 'saved' : 'none';
  } catch {
    return 'unknown';
  }
}
