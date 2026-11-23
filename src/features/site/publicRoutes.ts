/** SPA routes that must keep loading app.html. Anything else public is prerendered, or it is a 404. */

export const APP_REWRITE_SOURCES = [
  '/app',
  '/app/privacy',
  '/eye',
  '/live',
  '/live-legacy',
  '/progress',
  '/reminders',
  '/settings',
  '/spot-fix',
  '/calibrate',
  '/calibrate/:path*',
  '/set-my-zen',
  '/set-my-zen-legacy',
  '/welcome',
  '/break',
  '/stretches',
  '/stretches/:path*',
  '/neck',
  '/debug',
] as const;

const APP_EXACT = new Set<string>(APP_REWRITE_SOURCES.filter((source) => !source.includes(':')));

/** True for guest and signed-in app screens, including stretch and calibrate details. */
export function isKnownAppPath(pathname: string): boolean {
  const path = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (APP_EXACT.has(path)) return true;
  return path.startsWith('/stretches/') || path.startsWith('/calibrate/');
}

/**
 * Workbox tests pathname + search. App navigations use the app shell.
 * Public pages and unknown URLs stay on the network so Vercel can return real HTML or a 404.
 */
export const APP_NAVIGATION_RE =
  /^\/(?:app(?:\/privacy)?|eye|live(?:-legacy)?|progress|reminders|settings|spot-fix|calibrate(?:\/.*)?|set-my-zen(?:-legacy)?|welcome|break|stretches(?:\/.*)?|neck|debug)\/?(?:\?.*)?$/;

export function vercelRewrites(publicPaths: readonly string[]): { source: string; destination: string }[] {
  const pages = publicPaths
    .filter((path) => path !== '/')
    .map((source) => ({ source, destination: `${source}.html` }));
  const app = APP_REWRITE_SOURCES.map((source) => ({ source, destination: '/app.html' }));
  return [...pages, ...app];
}
