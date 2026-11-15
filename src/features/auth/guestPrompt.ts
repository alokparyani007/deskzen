const KEY = 'deskzen.guest.setupPrompt';

type Memory = Pick<Storage, 'getItem' | 'setItem'>;

/** Ask once, after a guest saves a Zen. Dismiss keeps it quiet. */
export function markGuestSetupPrompt(storage: Memory = localStorage): void {
  try {
    if (storage.getItem(KEY) === 'dismissed') return;
    storage.setItem(KEY, 'pending');
  } catch {
    // The prompt is optional.
  }
}

export function guestSetupPromptPending(storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  try {
    return storage.getItem(KEY) === 'pending';
  } catch {
    return false;
  }
}

export function dismissGuestSetupPrompt(storage: Memory = localStorage): void {
  try {
    storage.setItem(KEY, 'dismissed');
  } catch {
    // Hiding it for this view is enough.
  }
}
