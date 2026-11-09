import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';
import { PrivacyPolicyPage, TermsPage } from './LegalPage';
import { SiteHome } from './SiteHome';
import { CONTACT_EMAIL } from './SiteChrome';
import { FAQS, PAGE_META, jsonLd } from './seo';
import { PRERENDER_PATHS, render as renderPage } from '../../entry-server';

function render(node: ReturnType<typeof createElement>): string {
  return renderToString(createElement(MemoryRouter, null, node)).replace(/<!-- -->/g, '').replace(/&#x27;|&rsquo;|’/g, "'");
}

describe('public site', () => {
  it('renders the homepage copy, CTAs and real screenshots', () => {
    const html = render(createElement(SiteHome));
    expect(html).toContain('Feel better by 3 PM.');
    expect(html.match(/>Get started free</g)?.length).toBeGreaterThanOrEqual(4);
    expect(html.match(/No credit card\. 30-second setup\./g)?.length).toBe(3);
    expect(html).toContain('Breaks and progress, built in');
    expect(html).toContain('/site/reminders.webp');
    expect(html).toContain('/site/progress.webp');
    expect(html).toContain('Your camera never leaves your device.');
    expect(html).toContain('Free during early access');
    expect(html).toContain('DeskZen is a wellness tool, not a medical device.');
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
    expect(html).toContain('href="/login"');
  });

  it('renders email sign-in, hides Google for now, and has no Apple button', () => {
    const html = render(createElement(LoginPage));
    expect(html).toContain('Welcome to DeskZen');
    expect(html).not.toContain('Continue with Google');
    expect(html).toContain('Email me a sign-in link');
    expect(html).not.toContain('Apple');
    expect(html).toContain('Your camera stays on your device.');
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
  });

  it('renders final Privacy and Terms with contact email and no draft wording', () => {
    for (const page of [PrivacyPolicyPage, TermsPage]) {
      const html = render(createElement(page));
      expect(html).not.toMatch(/\bDraft\b/i);
      expect(html).not.toMatch(/coming soon|before accounts open|when sign-in opens/i);
      expect(html).toContain('Last updated November 9, 2026');
      expect(html).toContain(CONTACT_EMAIL);
      expect(html).toContain('wellness tool, not a medical device');
    }
    const privacy = render(createElement(PrivacyPolicyPage));
    expect(privacy).toContain('Privacy Policy');
    expect(privacy).toContain('Your camera stays on your device');
    expect(privacy).toContain('Supabase');
    expect(privacy).toContain('Vercel');
    const terms = render(createElement(TermsPage));
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
    }
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
  });

  it('server-renders every public page for the build prerender', () => {
    for (const path of PRERENDER_PATHS) expect(renderPage(path).length).toBeGreaterThan(1000);
    expect(renderPage('/privacy')).toContain('Your camera stays on your device');
    expect(renderPage('/')).toContain('Breaks and progress, built in');
  });

  it('keeps the FAQ free of medical claims', () => {
    const text = FAQS.map((f) => `${f.q} ${f.a}`).join(' ').toLowerCase();
    expect(text).toContain('wellness tool');
    expect(text).toContain('doesn\u2019t diagnose');
    expect(text).not.toMatch(/\b(cure|cures|heal|heals|treats back pain|prevents injury)\b/);
  });
});
