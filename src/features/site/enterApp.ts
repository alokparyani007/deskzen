import { PAGE_META } from './seo';

function pathnameOf(href: string): string {
  try {
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) {
      return new URL(href).pathname || '/';
    }
  } catch {
    // Relative path with a stray colon, or a bad URL: fall through.
  }
  const path = href.split('#')[0]?.split('?')[0] ?? '';
  if (!path) return '/';
  return path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path;
}

/** Homepage, Privacy, Terms and login: the prerendered public pages. */
export function isPublicPath(href: string): boolean {
  return Object.prototype.hasOwnProperty.call(PAGE_META, pathnameOf(href));
}

/** Signed-in app routes (Home, Live view, Set my Zen, and the rest). */
export function isAppPath(href: string): boolean {
  const path = pathnameOf(href);
  return path.startsWith('/') && !isPublicPath(path);
}

/** The public HTML files include the Google Analytics snippet; app.html does not. */
export function documentHasPublicAnalytics(doc?: Pick<Document, 'querySelector'> | null): boolean {
  const root = doc === undefined ? (typeof document === 'undefined' ? null : document) : doc;
  return Boolean(root?.querySelector('script[src*="googletagmanager.com/gtag/js"]'));
}

/** True when an app route is still running inside a public page's HTML (so analytics is loaded). */
export function shouldReloadToAppDocument(currentHref: string, hasAnalyticsSnippet: boolean): boolean {
  return hasAnalyticsSnippet && isAppPath(currentHref);
}

/** Leave a public page for the app with a full load, so the server sends app.html without analytics. */
export function enterApp(href: string, assign: (url: string) => void = (url) => window.location.assign(url)): void {
  assign(href);
}
