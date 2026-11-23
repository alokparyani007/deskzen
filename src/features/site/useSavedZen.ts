import { useEffect, useState } from 'react';
import { clearZenSavedFlag, detectSavedZen, markZenSaved, readZenSavedFlag } from '../../lib/storage/zenFlag';

/**
 * Whether this device already has a Zen outline.
 * The first render matches the prerendered page (no Zen) so hydration stays stable.
 * A localStorage flag, then IndexedDB, updates it after mount.
 */
export function useSavedZen(override?: boolean): boolean {
  const [saved, setSaved] = useState(override ?? false);

  useEffect(() => {
    if (override !== undefined) return;
    let cancel = false;
    // After paint, so the prerendered "start" button can hydrate, then swap if a Zen is already here.
    queueMicrotask(() => {
      if (!cancel && readZenSavedFlag()) setSaved(true);
    });
    void detectSavedZen().then((found) => {
      if (cancel || found === 'unknown') return;
      const yes = found === 'saved';
      setSaved(yes);
      if (yes) markZenSaved();
      else clearZenSavedFlag();
    });
    return () => {
      cancel = true;
    };
  }, [override]);

  return saved;
}
