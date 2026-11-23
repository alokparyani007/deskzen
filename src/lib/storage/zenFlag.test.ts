import { describe, expect, it } from 'vitest';
import { clearZenSavedFlag, libraryHasZen, markZenSaved, readZenSavedFlag, ZEN_SAVED_KEY } from './zenFlag';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

describe('saved Zen flag', () => {
  it('treats only a version 3 outline as a saved Zen', () => {
    expect(libraryHasZen(null)).toBe(false);
    expect(libraryHasZen({ prints: [] })).toBe(false);
    expect(libraryHasZen({ prints: [{ mode: 'sit' }] })).toBe(false);
    expect(libraryHasZen({ prints: [{ zen: { version: 2 } }] })).toBe(false);
    expect(libraryHasZen({ prints: [{ zen: { version: 3, mode: 'sit' } }] })).toBe(true);
  });

  it('remembers and clears the on-device flag', () => {
    const storage = memory();
    expect(readZenSavedFlag(storage)).toBe(false);
    markZenSaved(storage);
    expect(storage.getItem(ZEN_SAVED_KEY)).toBe('1');
    expect(readZenSavedFlag(storage)).toBe(true);
    clearZenSavedFlag(storage);
    expect(readZenSavedFlag(storage)).toBe(false);
  });

  it('stays quiet when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readZenSavedFlag(broken)).toBe(false);
    expect(() => markZenSaved(broken)).not.toThrow();
    expect(() => clearZenSavedFlag(broken)).not.toThrow();
  });
});
