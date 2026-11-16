import { useEffect } from 'react';
import { LIVE_FIVE_MIN_MS } from '../lib/usage/events';
import { trackUsage } from '../lib/usage/track';

/**
 * Counts Live view when the camera is on, then again after five continuous minutes.
 * Pausing or leaving clears the timer. Each event is still once per browser tab.
 */
export function useLiveUsage(tracking: boolean): void {
  useEffect(() => {
    if (!tracking) return;
    trackUsage('live_started');
    const id = window.setTimeout(() => trackUsage('live_5min'), LIVE_FIVE_MIN_MS);
    return () => window.clearTimeout(id);
  }, [tracking]);
}
