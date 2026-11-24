import { StrictMode } from 'react';
import type { ComponentType } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AboutPage } from './features/site/AboutPage';
import { ContactPage } from './features/site/ContactPage';
import { LoginPage } from './features/site/LoginPage';
import { AfternoonSlumpPage, LearnIndexPage, StopSlouchingPage } from './features/site/LearnPages';
import { PrivatePosturePage } from './features/site/PrivatePosturePage';
import { SlouchTimerPage } from './features/site/SlouchTimerPage';
import { StandStretchPage } from './features/site/StandStretchPage';
import { MacWindowsPage } from './features/site/MacWindowsPage';
import { NotFoundPage } from './features/site/NotFoundPage';
import { PrivacyPolicyPage, TermsPage } from './features/site/LegalPage';
import { SiteHome } from './features/site/SiteHome';
import { WebcamPostureCheckerPage } from './features/site/WebcamPostureCheckerPage';
import type { PublicPath } from './features/site/seo';

export { OG_IMAGE, PAGE_META, SITE_URL, jsonLd, pageOg, pageUrl } from './features/site/seo';
export { SITEMAP_ENTRIES, sitemapRecords, sitemapXml } from './features/site/sitemap';

const pages: Record<PublicPath, ComponentType> = {
  '/': SiteHome,
  '/privacy': PrivacyPolicyPage,
  '/terms': TermsPage,
  '/login': LoginPage,
  '/about': AboutPage,
  '/contact': ContactPage,
  '/learn': LearnIndexPage,
  '/learn/stop-slouching-at-your-desk': StopSlouchingPage,
  '/learn/afternoon-slump': AfternoonSlumpPage,
  '/learn/slouch-detector-vs-sit-up-timer': SlouchTimerPage,
  '/learn/stand-up-and-stretch-reminders': StandStretchPage,
  '/learn/private-posture-reminder': PrivatePosturePage,
  '/webcam-posture-checker': WebcamPostureCheckerPage,
  '/posture-reminder-mac-windows': MacWindowsPage,
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

/** Static 404 body. The prerender writes it to dist/404.html and strips the app script. */
export function renderNotFound(): string {
  return renderToString(
    <StrictMode>
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    </StrictMode>,
  );
}
