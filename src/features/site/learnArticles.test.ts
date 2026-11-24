import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LearnIndexPage } from './LearnPages';
import { PrivatePosturePage } from './PrivatePosturePage';
import { SlouchTimerPage } from './SlouchTimerPage';
import { StandStretchPage } from './StandStretchPage';
import { ARTICLE_SEO, PAGE_META, PRIVATE_POSTURE_FAQS, SLOUCH_TIMER_FAQS, STAND_STRETCH_FAQS } from './seo';

function render(node: ReturnType<typeof createElement>): string {
  return renderToString(createElement(MemoryRouter, null, node)).replace(/<!-- -->/g, '').replace(/&#x27;|&rsquo;|&apos;|’/g, "'");
}

function words(html: string): number {
  const article = html.match(/<article[\s\S]*<\/article>/)?.[0] ?? html;
  return article
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&rsquo;|&apos;|'/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;
}

const articles = [
  { page: SlouchTimerPage, path: '/learn/slouch-detector-vs-sit-up-timer' as const, faqs: SLOUCH_TIMER_FAQS, phrases: ['slouch detector', 'posture timer', 'sit up straight reminder'] },
  { page: StandStretchPage, path: '/learn/stand-up-and-stretch-reminders' as const, faqs: STAND_STRETCH_FAQS, phrases: ['stand up reminder', 'stretch reminder', 'break reminder app'] },
  { page: PrivatePosturePage, path: '/learn/private-posture-reminder' as const, faqs: PRIVATE_POSTURE_FAQS, phrases: ['private posture app', 'webcam privacy', 'on-device posture'] },
];

describe('new Learn articles', () => {
  it('gives the Learn index a real introduction, summaries, and landing links', () => {
    const html = render(createElement(LearnIndexPage));
    expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/webcam-posture-checker"');
    expect(html).toContain('href="/posture-reminder-mac-windows"');
    expect(html).toContain('Privacy Policy');
    for (const path of Object.keys(ARTICLE_SEO)) {
      expect(html).toContain(`href="${path}"`);
      expect(html).toContain(ARTICLE_SEO[path as keyof typeof ARTICLE_SEO].headline);
    }
    expect(words(html)).toBeGreaterThanOrEqual(400);
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toMatch(/\b(cure|cures|heal|heals|fixes back pain|treats back pain|prevents injury|click here)\b/);
  });

  it('renders each new article with meta, breadcrumbs, author, links, and no medical claims', () => {
    for (const article of articles) {
      const html = render(createElement(article.page));
      const meta = PAGE_META[article.path];
      const seo = ARTICLE_SEO[article.path];
      expect(html.match(/<h1[\s>]/g)?.length, article.path).toBe(1);
      expect(html).toContain(seo.headline);
      expect(html).toContain('Alok Paryani, Founder');
      expect(html).toContain('href="/about"');
      expect(html).not.toContain('DeskZen team');
      expect(html).toContain(`dateTime="${seo.published}"`);
      expect(html).toContain('aria-label="Breadcrumb"');
      expect(html).toContain('aria-current="page"');
      expect(html).toContain('href="/"');
      expect(html).toContain('href="/learn"');
      expect(html).toContain('href="/set-my-zen"');
      expect(html).toContain('>Set my Zen<');
      expect(html).toContain('wellness tool, not a medical device');
      expect(html).toContain('health professional');
      expect(html).not.toContain('/site/hero-maya.webp');
      expect(html).not.toContain('\u2014');
      expect(html).not.toContain('click here');
      expect(html.toLowerCase()).not.toMatch(/\b(cure|cures|heal|heals|fixes back pain|treats back pain|prevents injury)\b/);
      const count = words(html);
      expect(count, article.path).toBeGreaterThanOrEqual(900);
      expect(count, article.path).toBeLessThanOrEqual(1450);
      for (const phrase of article.phrases) expect(html.toLowerCase(), article.path).toContain(phrase);
      for (const { q, a } of article.faqs) {
        expect(html).toContain(q);
        expect(html).toContain(a);
      }
      expect(meta.title.length, meta.title).toBeLessThanOrEqual(60);
      expect(meta.description.length, meta.description).toBeLessThanOrEqual(160);
      expect(meta.ogTitle).toBe(meta.title);
      expect(meta.ogDescription).toBe(meta.description);
      expect(meta.title).not.toContain('\u2014');
      expect(meta.description).not.toContain('\u2014');
    }
  });
});
