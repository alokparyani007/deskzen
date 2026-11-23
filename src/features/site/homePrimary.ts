import { trackUsage } from '../../lib/usage/track';
import type { UsageEventName } from '../../lib/usage/events';

/** Google Analytics event for the home page primary button. Usage still counts try_now_click. */
export const HOME_PRIMARY_EVENT = 'home_primary_click';

export type HomePrimaryPath = '/set-my-zen' | '/live';

type Gtag = (command: string, name: string, params?: Record<string, string>) => void;

function readGtag(host: unknown): Gtag | undefined {
  if (!host || typeof host !== 'object' || !('gtag' in host)) return undefined;
  const gtag = (host as { gtag?: unknown }).gtag;
  if (typeof gtag !== 'function') return undefined;
  return (command, name, params) => {
    (gtag as Gtag)(command, name, params);
  };
}

/**
 * Count the home primary button.
 * try_now_click stays in the anonymous usage table (no schema change).
 * home_primary_click goes to the existing Google Analytics tag on the public pages.
 */
export function trackHomePrimary(
  destination: HomePrimaryPath,
  deps: { track?: (event: UsageEventName) => void; gtag?: Gtag } = {},
): void {
  try {
    (deps.track ?? trackUsage)('try_now_click');
  } catch {
    // A missed count must not block the click.
  }
  const gtag = deps.gtag ?? readGtag(typeof globalThis === 'undefined' ? null : globalThis);
  if (!gtag) return;
  try {
    gtag('event', HOME_PRIMARY_EVENT, { destination });
  } catch {
    // Analytics is optional.
  }
}
