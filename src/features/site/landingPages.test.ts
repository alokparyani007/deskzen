import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { render as renderPage, renderNotFound } from '../../entry-server';
import { MacWindowsPage } from './MacWindowsPage';
import { NotFoundPage } from './NotFoundPage';
import { WebcamPostureCheckerPage } from './WebcamPostureCheckerPage';
import { CHECKER_FAQS, MAC_FAQS, PAGE_META, jsonLd } from './seo';

function render(node: ReturnType<typeof createElement>): string {
  return renderToString(createElement(MemoryRouter, null, node)).replace(/<!-- -->/g, '');
}

describe('keyword landing pages', () => {
  it('renders the webcam checker with a Set my Zen call to action', () => {
    const html = render(createElement(WebcamPostureCheckerPage));
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(html).toContain('Free webcam posture checker');
    expect(html).toContain('slouch detector');
    expect(html).toContain('browser posture checker');
    expect(html).toContain('free posture corrector app');
    expect(html).toContain('no download');
    expect(html).toContain('href="/set-my-zen"');
    expect(html).toContain('>Set my Zen<');
    expect(html).toContain('The camera stays on your device');
    expect(html).toContain('never saved or uploaded');
    expect(html).toContain('href="/posture-reminder-mac-windows"');
    expect(html).toContain('href="/learn/stop-slouching-at-your-desk"');
    expect(html).toContain('wellness tool, not a medical device');
    expect(html).not.toContain('/site/hero-maya.webp');
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toMatch(/\b(cure|cures|fixes back pain|treats back pain)\b/);
    for (const { q, a } of CHECKER_FAQS) {
      expect(html).toContain(q);
      expect(html).toContain(a);
    }
    expect(PAGE_META['/webcam-posture-checker'].description.length).toBeLessThanOrEqual(160);
    expect(PAGE_META['/webcam-posture-checker'].ogTitle).toBe(PAGE_META['/webcam-posture-checker'].title);
  });

  it('renders the Mac and Windows page', () => {
    const html = render(createElement(MacWindowsPage));
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(html).toContain('Posture reminder for Mac and Windows');
    expect(html).toContain('laptop');
    expect(html).toContain('Nothing to download');
    expect(html).toContain('href="/set-my-zen"');
    expect(html).toContain('href="/webcam-posture-checker"');
    expect(html).toContain('href="/learn/afternoon-slump"');
    expect(html).toContain('camera stays on your device');
    expect(html).not.toContain('/site/hero-maya.webp');
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toMatch(/\b(cure|cures|fixes back pain|treats back pain)\b/);
    for (const { q, a } of MAC_FAQS) {
      expect(html).toContain(q);
      expect(html).toContain(a);
    }
    expect(PAGE_META['/posture-reminder-mac-windows'].description.length).toBeLessThanOrEqual(160);
    expect(PAGE_META['/posture-reminder-mac-windows'].ogTitle).toBe(PAGE_META['/posture-reminder-mac-windows'].title);
  });

  it('publishes SoftwareApplication and FAQ structured data', () => {
    for (const path of ['/webcam-posture-checker', '/posture-reminder-mac-windows'] as const) {
      const ld = JSON.stringify(jsonLd(path));
      expect(ld).toContain('"SoftwareApplication"');
      expect(ld).toContain('"FAQPage"');
      expect(ld).toContain('"price":"0"');
      expect(ld).toContain('"priceCurrency":"USD"');
      expect(ld).toContain('"BreadcrumbList"');
      expect(renderPage(path).length).toBeGreaterThan(1000);
    }
    expect(renderPage('/webcam-posture-checker')).toContain('Free webcam posture checker');
    expect(renderPage('/posture-reminder-mac-windows')).toContain('Posture reminder for Mac and Windows');
  });

  it('renders a friendly 404 with a way home', () => {
    const html = render(createElement(NotFoundPage));
    expect(html).toContain('We cannot find that page');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/set-my-zen"');
    expect(html).toContain('href="/webcam-posture-checker"');
    expect(html).toContain('href="/posture-reminder-mac-windows"');
    expect(html).not.toContain('\u2014');
    expect(renderNotFound()).toContain('We cannot find that page');
  });
});
