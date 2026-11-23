import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LoginPage } from './LoginPage';
import { AfternoonSlumpPage, LearnIndexPage, StopSlouchingPage } from './LearnPages';
import { MacWindowsPage } from './MacWindowsPage';
import { PrivacyPolicyPage, TermsPage } from './LegalPage';
import { SiteHome } from './SiteHome';
import { WebcamPostureCheckerPage } from './WebcamPostureCheckerPage';
import { CONTACT_EMAIL } from './SiteChrome';
import { isPublicPath } from './enterApp';
import { SITEMAP_ENTRIES, pickLastmod, sitemapXml } from './sitemap';
import { FAQS, PAGE_META, jsonLd } from './seo';
import { PRERENDER_PATHS, render as renderPage } from '../../entry-server';

function render(node: ReturnType<typeof createElement>): string {
  return renderToString(createElement(MemoryRouter, null, node)).replace(/<!-- -->/g, '').replace(/&#x27;|&rsquo;|’/g, "'");
}

describe('public site', () => {
  it('renders the homepage copy and a direct start button', () => {
    const html = render(createElement(SiteHome));
    expect(html).toContain('Gentle webcam nudges when you slouch.');
    expect(html.match(/>Start free, no sign-up</g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain('>Try it now<');
    expect(html.match(/Runs on your device\. No video saved\./g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('href="/set-my-zen"');
    expect(html).not.toContain('href="/live"');
    expect(html).not.toContain('Get started free');
    expect(html).not.toContain('Open DeskZen');
    expect(html).not.toMatch(/href="\/set-my-zen"[^>]*data-discover="true"|data-discover="true"[^>]*href="\/set-my-zen"/);
    expect(html).toContain('How it works');
    expect(html).toContain('Set my Zen');
    expect(html).toContain('Work as usual');
    expect(html).toContain('Get a gentle nudge when you slouch');
    expect(html).not.toContain('/site/hero-maya.webp');
    expect(html).toContain('/site/slouch-nudge.svg');
    expect(html).toContain('/site/reminders.webp');
    expect(html).toContain('/site/progress.webp');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('DeskZen live view on a laptop');
    expect(html).toContain('href="/webcam-posture-checker"');
    expect(html).toContain('href="/posture-reminder-mac-windows"');
    expect(html).toContain('href="/learn/stop-slouching-at-your-desk"');
    expect(html).toContain('href="/learn/afternoon-slump"');
    expect(html).toContain('A free webcam posture reminder with no sign-up.');
    expect(html).toContain('Your camera never leaves your device.');
    expect(html).toContain('Free during early access');
    expect(html).toContain('DeskZen is a wellness tool, not a medical device.');
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
    expect(html).toContain('href="/login"');
    expect(html).not.toContain('\u2014');
    const signedIn = render(createElement(SiteHome, { signedIn: true }));
    expect(signedIn).toContain('Open DeskZen');
    expect(signedIn).toContain('href="/app"');
    expect(signedIn).not.toContain('Try it now, no sign-up');
    expect(signedIn).not.toMatch(/href="\/app"[^>]*data-discover="true"|data-discover="true"[^>]*href="\/app"/);
    const returning = render(createElement(SiteHome, { hasZen: true }));
    expect(returning.match(/>Open Live view</g)?.length).toBeGreaterThanOrEqual(2);
    expect(returning.match(/>Reset my Zen</g)?.length).toBeGreaterThanOrEqual(2);
    expect(returning).toContain('href="/live"');
    expect(returning).toContain('href="/set-my-zen"');
    expect(returning).not.toContain('Start free, no sign-up');
    expect(returning).not.toMatch(/href="\/live"[^>]*data-discover="true"|data-discover="true"[^>]*href="\/live"/);
  });

  it('renders email sign-in, hides Google for now, and has no Apple button', () => {
    const html = render(createElement(LoginPage));
    expect(html).toContain('Welcome to DeskZen');
    expect(html).toContain('Try it right away. Sign in is optional.');
    expect(html).toContain('Try it now, no sign-up');
    expect(html).toContain('href="/set-my-zen"');
    expect(html).not.toContain('Continue with Google');
    expect(html).toContain('Email me a sign-in link');
    expect(html).toContain('or sign in');
    expect(html).not.toContain('Apple');
    expect(html).toContain('Your camera stays on your device.');
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
  });

  it('does not client-side route from public pages into the app', () => {
    for (const page of [SiteHome, LoginPage, PrivacyPolicyPage, TermsPage, LearnIndexPage, StopSlouchingPage, AfternoonSlumpPage, WebcamPostureCheckerPage, MacWindowsPage]) {
      const html = render(createElement(page));
      const hrefs = [...html.matchAll(/href="([^"]+)"[^>]*data-discover="true"|data-discover="true"[^>]*href="([^"]+)"/g)].map(
        (match) => match[1] ?? match[2] ?? '',
      );
      for (const href of hrefs) {
        expect(isPublicPath(href), href).toBe(true);
      }
    }
  });

  it('renders final Privacy and Terms with contact email and no draft wording', () => {
    for (const page of [PrivacyPolicyPage, TermsPage]) {
      const html = render(createElement(page));
      expect(html).not.toMatch(/\bDraft\b/i);
      expect(html).not.toMatch(/coming soon|before accounts open|when sign-in opens/i);
      expect(html).toContain(CONTACT_EMAIL);
      expect(html).toContain('wellness tool, not a medical device');
    }
    const privacy = render(createElement(PrivacyPolicyPage));
    expect(privacy).toContain('Last updated November 16, 2026');
    expect(privacy).toContain('Privacy Policy');
    expect(privacy).toContain('Your camera stays on your device');
    expect(privacy).toContain('Supabase');
    expect(privacy).toContain('Vercel');
    expect(privacy).toContain('Google Analytics');
    expect(privacy).toContain('The DeskZen app does not load Google Analytics');
    expect(privacy).toContain('anonymous usage events, like');
    expect(privacy).toContain('started Live view');
    expect(privacy).toContain('no personal info and no camera data');
    expect(privacy).toContain('We do not store your email, account id, or IP address');
    expect(privacy).toContain('Optional feedback answers and any note you write are stored without your name or email.');
    expect(privacy).not.toContain('The DeskZen app itself (the camera and posture checks) uses no analytics');
    expect(privacy).not.toContain('We do not use third-party analytics');
    expect(privacy).not.toContain('\u2014');
    const terms = render(createElement(TermsPage));
    expect(terms).toContain('Last updated November 9, 2026');
    expect(terms).toContain('Terms of Use');
    expect(terms).toContain('email magic link');
  });

});

describe('search and AI crawler readiness', () => {
  it('has a posture-focused homepage title and description', () => {
    expect(PAGE_META['/'].title).toMatch(/DeskZen/);
    expect(PAGE_META['/'].title.toLowerCase()).toContain('posture');
    for (const meta of Object.values(PAGE_META)) {
      expect(meta.title.length).toBeLessThanOrEqual(60);
      expect(meta.description.length).toBeLessThanOrEqual(180);
      expect(meta.description).not.toContain('\u2014');
    }
    expect(PAGE_META['/'].description.length).toBeLessThanOrEqual(160);
    expect(PAGE_META['/'].ogTitle).toBe(PAGE_META['/'].title);
    expect(PAGE_META['/'].title.toLowerCase()).toContain('posture reminder');
  });

  it('renders one H1, the FAQ and posture headings on the homepage', () => {
    const html = render(createElement(SiteHome));
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(html).toContain('Posture and break reminders for your desk');
    for (const { q } of FAQS) expect(html).toContain(q);
  });

  it('publishes WebApplication, Organization and FAQPage structured data', () => {
    const ld = JSON.stringify(jsonLd('/'));
    expect(ld).toContain('"WebApplication"');
    expect(ld).toContain('"price":"0"');
    expect(ld).toContain('"priceCurrency":"USD"');
    expect(ld).toContain('"Organization"');
    expect(ld).toContain('sales@deskzenapp.com');
    expect(ld).toContain('"FAQPage"');
    expect(JSON.stringify(jsonLd('/privacy'))).not.toContain('FAQPage');
    expect(JSON.stringify(jsonLd('/learn/stop-slouching-at-your-desk'))).toContain('"Article"');
    expect(JSON.stringify(jsonLd('/learn/afternoon-slump'))).toContain('"Article"');
    expect(JSON.stringify(jsonLd('/learn'))).not.toContain('"Article"');
  });

  it('renders both Learn articles with sources, a soft CTA, and no medical claims', () => {
    const slouch = render(createElement(StopSlouchingPage));
    const slump = render(createElement(AfternoonSlumpPage));
    expect(slouch).toContain('How to stop slouching at your desk');
    expect(slump).toContain('Why you crash at 3 PM (and how your posture plays a part)');
    const words = (html: string) => {
      const article = html.match(/<article[\s\S]*<\/article>/)?.[0] ?? html;
      return article.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&rsquo;|&apos;|'/g, "'").replace(/\s+/g, ' ').trim().split(' ').length;
    };
    for (const html of [slouch, slump]) {
      expect(words(html)).toBeGreaterThanOrEqual(900);
      expect(words(html)).toBeLessThanOrEqual(1500);
      expect(html).toContain('may help');
      expect(html).toContain('health professional');
      expect(html).toContain('wellness tool, not a medical device');
      expect(html).toContain('href="/login"');
      expect(html).toContain('Try DeskZen free');
      expect(html.toLowerCase()).not.toMatch(/\b(cure|cures|heal|heals|treats back pain|prevents injury)\b/);
    }
    expect(slouch).toContain('https://www.osha.gov/etools/computer-workstations');
    expect(slouch).toContain('https://www.osha.gov/etools/computer-workstations/positions');
    expect(slouch).toContain('https://www.health.harvard.edu/staying-healthy/why-good-posture-matters');
    expect(slouch).toContain('https://www.health.harvard.edu/pain/3-surprising-risks-of-poor-posture');
    expect(slump).toContain('https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms.aspx');
    expect(slump).toContain('https://www.nhlbi.nih.gov/health/sleep-deprivation');
    expect(slump).toContain('https://www.health.harvard.edu/staying-healthy/the-dangers-of-sitting');
    expect(slump).toContain('https://www.osha.gov/etools/computer-workstations/work-process');
  });

  it('lists Learn in the footer and every indexable page in the sitemap', () => {
    const home = render(createElement(SiteHome));
    expect(home).toContain('href="/learn"');
    expect(home).toContain('Learn');
    const indexed = SITEMAP_ENTRIES.map((entry) => entry.path).sort();
    const expected = (Object.keys(PAGE_META) as (keyof typeof PAGE_META)[]).filter((path) => path !== '/login').sort();
    expect(indexed).toEqual(expected);
    const xml = sitemapXml(
      SITEMAP_ENTRIES.map((entry) => ({
        loc: `https://www.deskzenapp.com${entry.path === '/' ? '/' : entry.path}`,
        lastmod: pickLastmod(['2026-11-16', '2026-11-23'], '2026-11-09'),
        changefreq: entry.changefreq,
        priority: entry.priority,
      })),
    );
    expect(xml).toContain('https://www.deskzenapp.com/learn/stop-slouching-at-your-desk');
    expect(xml).toContain('https://www.deskzenapp.com/webcam-posture-checker');
    expect(xml).toContain('https://www.deskzenapp.com/posture-reminder-mac-windows');
    expect(xml).toContain('<lastmod>2026-11-23</lastmod>');
    expect(xml).not.toContain('<lastmod>2026-11-09</lastmod>');
    expect(xml).not.toContain('/set-my-zen');
    expect(xml).not.toContain('/live<');
    const committed = readFileSync('public/sitemap.xml', 'utf8');
    expect(committed).toContain('https://www.deskzenapp.com/webcam-posture-checker');
    expect(committed).toContain('https://www.deskzenapp.com/posture-reminder-mac-windows');
    expect(committed).not.toContain('<lastmod>2026-11-09</lastmod>');
  });

  it('server-renders every public page for the build prerender', () => {
    for (const path of PRERENDER_PATHS) expect(renderPage(path).length).toBeGreaterThan(1000);
    expect(renderPage('/privacy')).toContain('Your camera stays on your device');
    expect(renderPage('/')).toContain('Gentle webcam nudges when you slouch.');
  });

  it('keeps the FAQ free of medical claims', () => {
    const text = FAQS.map((f) => `${f.q} ${f.a}`).join(' ').toLowerCase();
    expect(text).toContain('wellness tool');
    expect(text).toContain('doesn\u2019t diagnose');
    expect(text).toContain('no sign-up');
    expect(text).toContain('anonymous usage events');
    expect(text).not.toContain('uses no analytics');
    expect(text).not.toMatch(/sign in with a link sent to your email/i);
    expect(text).not.toMatch(/\b(cure|cures|heal|heals|treats back pain|prevents injury)\b/);
  });
});
