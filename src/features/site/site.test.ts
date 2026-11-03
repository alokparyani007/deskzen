import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage';
import { PrivacyPolicyPage, TermsPage } from './LegalPage';
import { SiteHome } from './SiteHome';
import { CONTACT_EMAIL } from './SiteChrome';

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

  it('renders sign-in with Google and email, and no Apple button yet', () => {
    const html = render(createElement(LoginPage));
    expect(html).toContain('Welcome to DeskZen');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Email me a sign-in link');
    expect(html).not.toContain('Apple');
    expect(html).toContain('Your camera stays on your device.');
    expect(html).toContain(`mailto:${CONTACT_EMAIL}`);
  });

  it('marks the legal pages as drafts with the contact email', () => {
    for (const page of [PrivacyPolicyPage, TermsPage]) {
      const html = render(createElement(page));
      expect(html).toContain('Draft');
      expect(html).toContain(CONTACT_EMAIL);
    }
  });

});
