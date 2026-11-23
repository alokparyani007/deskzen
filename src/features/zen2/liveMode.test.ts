import { describe, expect, it } from 'vitest';
import { liveDisplayMode, liveRequestMode, rememberedZenMode, rememberZenMode, type ModeStorage } from './liveMode';

function memory(): ModeStorage {
  const bag = new Map<string, string>();
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => {
      bag.set(key, value);
    },
  };
}

describe('live view mode', () => {
  it('remembers a standing Zen and ignores anything else', () => {
    const storage = memory();
    expect(rememberedZenMode(storage)).toBeNull();
    rememberZenMode('stand', storage);
    expect(rememberedZenMode(storage)).toBe('stand');
    storage.setItem('sitglow.zenMode', 'neither');
    expect(rememberedZenMode(storage)).toBeNull();
  });

  it('uses the saved Zen when work style still says sit', () => {
    expect(liveRequestMode({ workStyle: 'sit', sessionMode: 'sit', remembered: 'stand' })).toBe('stand');
    expect(liveRequestMode({ workStyle: 'stand', sessionMode: 'stand', remembered: 'sit' })).toBe('sit');
    expect(liveRequestMode({ workStyle: 'sit', sessionMode: 'sit', remembered: null })).toBe('sit');
  });

  it('keeps mixed mode on the current posture', () => {
    expect(liveRequestMode({ workStyle: 'mixed', sessionMode: 'sit', remembered: 'stand' })).toBe('sit');
    expect(liveRequestMode({ workStyle: 'mixed', sessionMode: 'stand', remembered: 'sit' })).toBe('stand');
  });

  it('labels Live view with the Zen that loaded, even when the request fell back', () => {
    expect(liveDisplayMode({ mode: 'stand', zen: { mode: 'stand' } }, 'sit')).toBe('stand');
    expect(liveDisplayMode({ mode: 'sit', zen: { mode: 'sit' } }, 'stand')).toBe('sit');
    expect(liveDisplayMode(null, 'stand')).toBe('stand');
    expect(liveDisplayMode({ mode: 'stand' }, 'sit')).toBe('stand');
  });
});
