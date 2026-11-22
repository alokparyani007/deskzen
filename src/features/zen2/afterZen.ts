import type { NavigateFunction } from 'react-router-dom';

/** Where Set my Zen goes once the outline is saved. */
export function destinationAfterZen(input: { signedIn: boolean; from: string | null }): '/live' | 'done' {
  // Guests who came from the public site (no in-app "from") go straight into Live view.
  if (!input.signedIn && !input.from) return '/live';
  return 'done';
}

/**
 * Open Live view and paint it before the next camera frame.
 * A normal navigation is a React transition. The pose loop calls setState on every
 * frame, so that transition never commits: the address bar shows /live and
 * "Fit and hold" stays on screen until a reload. flushSync commits the new route now.
 */
export function openLiveView(navigate: NavigateFunction, replace = false): void {
  navigate('/live', { replace, flushSync: true });
}
