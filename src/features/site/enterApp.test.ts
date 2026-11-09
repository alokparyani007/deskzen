import { describe, expect, it, vi } from 'vitest';
import {
  documentHasPublicAnalytics,
  enterApp,
  isAppPath,
  isPublicPath,
  shouldReloadToAppDocument,
} from './enterApp';

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
});
