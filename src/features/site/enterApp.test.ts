import { describe, expect, it, vi } from 'vitest';
import { PUBLIC_PATHS, shouldServeAppDocument } from '../../../scripts/app-document.ts';
import {
  documentHasPublicAnalytics,
  enterApp,
  isAppPath,
  isPublicPath,
  shouldReloadToAppDocument,
} from './enterApp';
import { PAGE_META } from './seo';

describe('public page to app navigation', () => {
  it('treats the prerendered site pages as public, including query strings', () => {
    for (const path of ['/', '/privacy', '/terms', '/login', '/privacy/', '/login?from=/app']) {
      expect(isPublicPath(path)).toBe(true);
      expect(isAppPath(path)).toBe(false);
    }
  });

  it('treats signed-in routes as app pages', () => {
    for (const path of ['/app', '/live', '/set-my-zen?pose=sit', '/app/privacy', '/progress', '/reminders', '/settings']) {
      expect(isAppPath(path)).toBe(true);
      expect(isPublicPath(path)).toBe(false);
    }
  });

  it('reloads only when an app route is still on a public HTML document', () => {
    expect(shouldReloadToAppDocument('/app', true)).toBe(true);
    expect(shouldReloadToAppDocument('/live', true)).toBe(true);
    expect(shouldReloadToAppDocument('/app', false)).toBe(false);
    expect(shouldReloadToAppDocument('/login', true)).toBe(false);
    expect(shouldReloadToAppDocument('/', true)).toBe(false);
    expect(shouldReloadToAppDocument('/privacy', false)).toBe(false);
  });

  it('detects the public-page Google Analytics snippet', () => {
    const withTag = { querySelector: (sel: string) => (sel.includes('gtag/js') ? {} : null) };
    const withoutTag = { querySelector: () => null };
    expect(documentHasPublicAnalytics(withTag)).toBe(true);
    expect(documentHasPublicAnalytics(withoutTag)).toBe(false);
    expect(documentHasPublicAnalytics(null)).toBe(false);
  });

  it('enters the app with a full page load', () => {
    const assign = vi.fn();
    enterApp('/app', assign);
    expect(assign).toHaveBeenCalledWith('/app');
  });

  it('serves app.html for guest app routes and index.html for public pages', () => {
    expect([...PUBLIC_PATHS].sort()).toEqual(Object.keys(PAGE_META).sort());
    const html = 'text/html,application/xhtml+xml';
    expect(shouldServeAppDocument('/set-my-zen', html)).toBe(true);
    expect(shouldServeAppDocument('/set-my-zen?pose=sit', html)).toBe(true);
    expect(shouldServeAppDocument('/live', html)).toBe(true);
    expect(shouldServeAppDocument('/app', html)).toBe(true);
    expect(shouldServeAppDocument('/', html)).toBe(false);
    expect(shouldServeAppDocument('/login', html)).toBe(false);
    expect(shouldServeAppDocument('/learn/afternoon-slump', html)).toBe(false);
    expect(shouldServeAppDocument('/privacy/', html)).toBe(false);
    expect(shouldServeAppDocument('/assets/index.js', html)).toBe(false);
    expect(shouldServeAppDocument('/src/main.tsx', '*/*')).toBe(false);
  });
});
