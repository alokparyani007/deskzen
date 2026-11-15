// Which HTML document a navigation should get.
// Public pages are prerendered from index.html (with analytics).
// Everything else is the app shell, app.html (no analytics).
// Keep this list in sync with PAGE_META in src/features/site/seo.ts.

export const PUBLIC_PATHS = [
  '/',
  '/privacy',
  '/terms',
  '/login',
  '/learn',
  '/learn/stop-slouching-at-your-desk',
  '/learn/afternoon-slump',
] as const;

export function pathnameOf(url: string | undefined): string {
  const raw = (url ?? '').split('#')[0]?.split('?')[0] ?? '';
  if (!raw) return '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

/** True when a browser navigation should be served app.html instead of the marketing page. */
export function shouldServeAppDocument(url: string, accept: string | string[] | undefined): boolean {
  const header = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
  if (!header.includes('text/html')) return false;
  const path = pathnameOf(url);
  if (!path.startsWith('/') || path.startsWith('/@') || path.startsWith('/__')) return false;
  if ((PUBLIC_PATHS as readonly string[]).includes(path)) return false;
  // Real files (js, css, images, app.html itself) include a dot.
  if (path.includes('.')) return false;
  return true;
}
