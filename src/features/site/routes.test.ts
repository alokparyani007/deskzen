import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { htmlTarget, shouldServeAppDocument } from '../../../scripts/app-document.ts';
import { APP_NAVIGATION_RE, isKnownAppPath, vercelRewrites } from './publicRoutes';
import { PAGE_META } from './seo';

describe('public routing, favicon, and robots', () => {
  it('rewrites known pages only, with no catch-all to the app shell', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      trailingSlash?: boolean;
      rewrites: { source: string; destination: string }[];
    };
    expect(vercel.trailingSlash).toBe(false);
    expect(vercel.rewrites).toEqual(vercelRewrites(Object.keys(PAGE_META)));
    expect(vercel.rewrites.some((rule) => rule.source.includes('(.*)') || rule.source === '/:path*')).toBe(false);
    expect(vercel.rewrites.some((rule) => rule.source === '/favicon.ico' || rule.destination === '/favicon.ico')).toBe(false);
    expect(vercel.rewrites.some((rule) => rule.source === '/set-my-zen' && rule.destination === '/app.html')).toBe(true);
    const redirects = (
      JSON.parse(readFileSync('vercel.json', 'utf8')) as {
        redirects?: { source: string; destination: string; has?: { value: string }[] }[];
      }
    ).redirects;
    expect(redirects?.some((rule) => rule.has?.some((item) => item.value === 'deskzenapp.com') && rule.destination.startsWith('https://www.deskzenapp.com/'))).toBe(true);
    expect(redirects?.some((rule) => rule.source === '/site/og.jpg' && rule.destination === '/site/deskzen-posture-reminders-og.jpg')).toBe(true);
    expect(vercel.rewrites.some((rule) => rule.source === '/live' && rule.destination === '/app.html')).toBe(true);
  });

  it('serves a real favicon file, not an HTML shell', () => {
    const ico = readFileSync('public/favicon.ico');
    expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
    expect(ico.length).toBeGreaterThan(100);
    expect(ico.subarray(0, 32).toString('utf8')).not.toContain('<');
    expect(readFileSync('index.html', 'utf8')).toContain('href="/favicon.ico"');
    expect(readFileSync('app.html', 'utf8')).toContain('href="/favicon.ico"');
  });

  it('keeps app screens out of Google and leaves the new pages crawlable', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    expect(robots).toContain('Disallow: /set-my-zen');
    expect(robots).toContain('Disallow: /live');
    expect(robots).not.toContain('webcam-posture-checker');
    expect(robots).not.toContain('posture-reminder-mac-windows');
  });

  it('classifies public pages, app screens, and unknown paths', () => {
    const html = 'text/html';
    expect(htmlTarget('/webcam-posture-checker', html)).toEqual({ kind: 'public', file: '/webcam-posture-checker.html' });
    expect(htmlTarget('/posture-reminder-mac-windows/', html)).toEqual({ kind: 'public', file: '/posture-reminder-mac-windows.html' });
    expect(htmlTarget('/', html)).toEqual({ kind: 'public', file: '/index.html' });
    expect(htmlTarget('/set-my-zen?pose=sit', html)).toEqual({ kind: 'app' });
    expect(htmlTarget('/stretches/neck-nod', html)).toEqual({ kind: 'app' });
    expect(htmlTarget('/blog', html)).toEqual({ kind: 'not-found' });
    expect(htmlTarget('/features', html)).toEqual({ kind: 'not-found' });
    expect(htmlTarget('/favicon.ico', html)).toEqual({ kind: 'passthrough' });
    expect(shouldServeAppDocument('/blog', html)).toBe(false);
    expect(shouldServeAppDocument('/live', html)).toBe(true);
    expect(shouldServeAppDocument('/set-my-zen', html)).toBe(true);
    for (const path of ['/app', '/app/privacy', '/set-my-zen', '/stretches/back-fold', '/calibrate/old', '/live?good=1']) {
      expect(isKnownAppPath(path.split('?')[0] ?? path), path).toBe(true);
      expect(APP_NAVIGATION_RE.test(path), path).toBe(true);
    }
    for (const path of ['/blog', '/webcam-posture-checker', '/learn/afternoon-slump', '/stretch', '/lives', '/']) {
      expect(isKnownAppPath(path), path).toBe(false);
      expect(APP_NAVIGATION_RE.test(path), path).toBe(false);
    }
  });
});
