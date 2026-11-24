import { pageUrl } from './seo';
import type { PublicPath } from './seo';

export type SitemapEntry = {
  path: PublicPath;
  changefreq: 'weekly' | 'monthly';
  priority: string;
  /** Repo files whose latest real change sets lastmod. The build reads these dates. */
  sources: readonly string[];
};

/** Public URLs worth indexing. Login stays prerendered but out of the sitemap. */
export const SITEMAP_ENTRIES: readonly SitemapEntry[] = [
  {
    path: '/',
    changefreq: 'weekly',
    priority: '1.0',
    sources: ['src/features/site/SiteHome.tsx', 'src/features/site/SiteHomeSections.tsx', 'index.html'],
  },
  {
    path: '/webcam-posture-checker',
    changefreq: 'monthly',
    priority: '0.9',
    sources: ['src/features/site/WebcamPostureCheckerPage.tsx', 'src/features/site/seo.ts'],
  },
  {
    path: '/posture-reminder-mac-windows',
    changefreq: 'monthly',
    priority: '0.9',
    sources: ['src/features/site/MacWindowsPage.tsx', 'src/features/site/seo.ts'],
  },
  {
    path: '/about',
    changefreq: 'monthly',
    priority: '0.6',
    sources: ['src/features/site/AboutPage.tsx', 'src/features/site/founderCopy.ts'],
  },
  {
    path: '/contact',
    changefreq: 'monthly',
    priority: '0.5',
    sources: ['src/features/site/ContactPage.tsx', 'src/features/site/ContactForm.tsx'],
  },
  { path: '/learn', changefreq: 'weekly', priority: '0.8', sources: ['src/features/site/LearnPages.tsx'] },
  {
    path: '/learn/stop-slouching-at-your-desk',
    changefreq: 'monthly',
    priority: '0.7',
    sources: ['src/features/site/LearnPages.tsx'],
  },
  { path: '/learn/afternoon-slump', changefreq: 'monthly', priority: '0.7', sources: ['src/features/site/LearnPages.tsx'] },
  {
    path: '/learn/slouch-detector-vs-sit-up-timer',
    changefreq: 'monthly',
    priority: '0.7',
    sources: ['src/features/site/SlouchTimerPage.tsx', 'src/features/site/seo.ts'],
  },
  {
    path: '/learn/stand-up-and-stretch-reminders',
    changefreq: 'monthly',
    priority: '0.7',
    sources: ['src/features/site/StandStretchPage.tsx', 'src/features/site/seo.ts'],
  },
  {
    path: '/learn/private-posture-reminder',
    changefreq: 'monthly',
    priority: '0.7',
    sources: ['src/features/site/PrivatePosturePage.tsx', 'src/features/site/seo.ts'],
  },
  { path: '/privacy', changefreq: 'monthly', priority: '0.4', sources: ['src/features/site/LegalPage.tsx'] },
  { path: '/terms', changefreq: 'monthly', priority: '0.4', sources: ['src/features/site/LegalPage.tsx'] },
];

/** Latest YYYY-MM-DD from real dates, or the build date when none are known. */
export function pickLastmod(dates: readonly (string | null | undefined)[], today: string): string {
  let best = '';
  for (const date of dates) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (date > best) best = date;
  }
  return best || today;
}

export function sitemapXml(entries: readonly { loc: string; lastmod: string; changefreq: string; priority: string }[]): string {
  const body = entries
    .map((entry) =>
      [
        '  <url>',
        `    <loc>${entry.loc}</loc>`,
        `    <lastmod>${entry.lastmod}</lastmod>`,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ].join('\n'),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapRecords(lastmodFor: (sources: readonly string[]) => string): { loc: string; lastmod: string; changefreq: string; priority: string }[] {
  return SITEMAP_ENTRIES.map((entry) => ({
    loc: pageUrl(entry.path),
    lastmod: lastmodFor(entry.sources),
    changefreq: entry.changefreq,
    priority: entry.priority,
  }));
}
