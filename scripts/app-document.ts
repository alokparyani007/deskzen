// Which HTML document a navigation should get.
// Public pages are prerendered from index.html (with analytics).
// Known app routes use app.html (no Google Analytics).
// Unknown pages are a real 404, not the app shell.
// Keep public paths in sync with PAGE_META in src/features/site/seo.ts.

import { isKnownAppPath } from '../src/features/site/publicRoutes.ts';
import { PAGE_META } from '../src/features/site/seo.ts';

export const PUBLIC_PATHS = Object.keys(PAGE_META);

export type HtmlTarget = { kind: 'public'; file: string } | { kind: 'app' } | { kind: 'not-found' } | { kind: 'passthrough' };

export function pathnameOf(url: string | undefined): string {
  const raw = (url ?? '').split('#')[0]?.split('?')[0] ?? '';
  if (!raw) return '/';
  return raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function acceptsDocument(accept: string | string[] | undefined): boolean {
  const header = Array.isArray(accept) ? accept.join(',') : (accept ?? '');
  if (!header) return true;
  return header.includes('text/html') || header.includes('*/*');
}

/** Where a navigation request should be served from. Files (a dot in the path) pass through. */
export function htmlTarget(url: string, accept: string | string[] | undefined): HtmlTarget {
  if (!acceptsDocument(accept)) return { kind: 'passthrough' };
  const path = pathnameOf(url);
  if (!path.startsWith('/') || path.startsWith('/@') || path.startsWith('/__')) return { kind: 'passthrough' };
  if (path.includes('.')) return { kind: 'passthrough' };
  if (PUBLIC_PATHS.includes(path)) {
    return { kind: 'public', file: path === '/' ? '/index.html' : `${path}.html` };
  }
  if (isKnownAppPath(path)) return { kind: 'app' };
  return { kind: 'not-found' };
}

/** True when a browser navigation should be served app.html instead of a marketing page. */
export function shouldServeAppDocument(url: string, accept: string | string[] | undefined): boolean {
  return htmlTarget(url, accept).kind === 'app';
}
