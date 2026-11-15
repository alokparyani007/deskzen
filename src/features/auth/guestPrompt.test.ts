import { describe, expect, it } from 'vitest';
import { dismissGuestSetupPrompt, guestSetupPromptPending, markGuestSetupPrompt } from './guestPrompt';

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  };
}

describe('guest save-setup prompt', () => {
  it('shows after a Zen is saved until the guest dismisses it', () => {
    const storage = memory();
    expect(guestSetupPromptPending(storage)).toBe(false);
    markGuestSetupPrompt(storage);
    expect(guestSetupPromptPending(storage)).toBe(true);
    dismissGuestSetupPrompt(storage);
    markGuestSetupPrompt(storage);
    expect(guestSetupPromptPending(storage)).toBe(false);
  });
});
