import { StrictMode } from 'react';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './features/site/LoginPage';
import { PrivacyPolicyPage, TermsPage } from './features/site/LegalPage';
import { SiteHome } from './features/site/SiteHome';
import type { PublicPath } from './features/site/seo';

export { OG_IMAGE, PAGE_META, SITE_URL, jsonLd, pageUrl } from './features/site/seo';

const pages: Record<PublicPath, ComponentType> = {
  '/': SiteHome,
  '/privacy': PrivacyPolicyPage,
  '/terms': TermsPage,
  '/login': LoginPage,
};

export const PRERENDER_PATHS = Object.keys(pages) as PublicPath[];

/** Build-time HTML for a public page, so search engines and AI crawlers can read it without JavaScript. */
export function render(path: PublicPath): string {
  const Page = pages[path];
  return renderToString(
    <StrictMode>
      <MemoryRouter initialEntries={[path]}>
        <Page />
      </MemoryRouter>
    </StrictMode>,
  );
}
