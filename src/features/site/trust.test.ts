import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AboutPage } from './AboutPage';
import { ContactSuccess } from './ContactForm';
import { ContactPage } from './ContactPage';
import { AfternoonSlumpPage, StopSlouchingPage } from './LearnPages';
import {
  ABOUT_CTA_AFTER_TELL,
  ABOUT_CTA_BEFORE_TELL,
  ABOUT_CTA_BUTTON,
  ABOUT_CTA_HEADING,
  ABOUT_CTA_LEAD,
  CONTACT_PARAGRAPHS,
  FOUNDER_HEADING,
  FOUNDER_PARAGRAPHS,
  FOUNDER_PHOTO_ALT,
  FOUNDER_PHOTO_SRC,
  FOUNDER_SIGN_NAME,
  FOUNDER_SIGN_ROLE,
} from './founderCopy';
import { PAGE_ART } from './pageArt';
import { PAGE_META, jsonLd, pageOg } from './seo';

function render(node: ReturnType<typeof createElement>): string {
  return renderToString(createElement(MemoryRouter, null, node))
    .replace(/<!-- -->/g, '')
    .replace(/&#x27;|&apos;|&rsquo;|’/g, "'");
}

describe('about, contact, and page art', () => {
  it('keeps the founder story word for word', () => {
    const html = render(createElement(AboutPage));
    expect(html).toContain(FOUNDER_HEADING);
    for (const paragraph of FOUNDER_PARAGRAPHS) expect(html).toContain(paragraph);
    expect(html).toContain(FOUNDER_SIGN_NAME);
    expect(html).toContain(FOUNDER_SIGN_ROLE);
    expect(FOUNDER_PHOTO_ALT).toBe('Alok Paryani, founder of DeskZen');
    expect(html).toContain(`src="${FOUNDER_PHOTO_SRC}"`);
    expect(html).toContain(`alt="${FOUNDER_PHOTO_ALT}"`);
    expect(html).toContain('id="alok-paryani"');
    const photo = readFileSync(`public${FOUNDER_PHOTO_SRC}`);
    expect(photo.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(photo.subarray(8, 12).toString('ascii')).toBe('WEBP');
    expect(photo.subarray(12, 16).toString('ascii')).toBe('VP8X');
    expect(1 + photo.readUIntLE(24, 3)).toBe(400);
    expect(1 + photo.readUIntLE(27, 3)).toBe(400);
    expect(photo.length).toBeLessThan(20_000);
    expect(html).toContain(PAGE_ART['/about'].src);
    expect(html).toContain(ABOUT_CTA_HEADING);
    expect(html).toContain(ABOUT_CTA_LEAD);
    expect(html).toContain(`${ABOUT_CTA_BEFORE_TELL}`);
    expect(html).toContain('href="#contact-form"');
    expect(html).toContain('>tell me<');
    expect(html).toContain(ABOUT_CTA_AFTER_TELL.trim());
    expect(html).toContain(`>${ABOUT_CTA_BUTTON}<`);
    expect(html).toContain('href="/set-my-zen"');
    expect(html).not.toMatch(/href="\/set-my-zen"[^>]*data-discover="true"|data-discover="true"[^>]*href="\/set-my-zen"/);
    expect(html).toContain('href="/contact"');
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toContain('sales@');
  });

  it('shows the contact form without an email address', () => {
    const html = render(createElement(ContactPage));
    for (const paragraph of CONTACT_PARAGRAPHS) expect(html).toContain(paragraph);
    expect(html).toContain("Let's talk");
    expect(html).toContain('>Name<');
    expect(html).toContain('>Email<');
    expect(html).toContain('>Message<');
    expect(html).toContain('>Send<');
    expect(html).toContain('company_url');
    expect(html).not.toContain('Email me at');
    expect(html).not.toContain('mailto:');
    expect(html.toLowerCase()).not.toContain('sales');
    expect(html).not.toContain('\u2014');
    const success = render(createElement(ContactSuccess));
    expect(success).toContain('Thanks. Your note is in.');
    expect(success).toContain('Alok reads every message.');
  });

  it('names Alok on article structured data and gives each guide its own image', () => {
    const images = new Set<string>();
    for (const path of Object.keys(PAGE_ART) as (keyof typeof PAGE_ART)[]) {
      const og = pageOg(path);
      expect(og.url).toBe(`https://www.deskzenapp.com${PAGE_ART[path].src}`);
      expect(og.alt).toBe(PAGE_ART[path].alt);
      expect(og.alt.toLowerCase()).not.toContain('feel better by 3 pm');
      expect(images.has(og.url)).toBe(false);
      images.add(og.url);
      const png = readFileSync(`public${PAGE_ART[path].src}`);
      expect(png.readUInt32BE(16)).toBe(1200);
      expect(png.readUInt32BE(20)).toBe(630);
      expect(PAGE_META[path].title.length).toBeLessThanOrEqual(60);
      expect(PAGE_META[path].description.length).toBeLessThanOrEqual(160);
    }
    const about = JSON.stringify(jsonLd('/about'));
    expect(about).toContain('"Person"');
    expect(about).toContain('"AboutPage"');
    expect(about).toContain('Alok Paryani');
    expect(about).toContain('"jobTitle":"Founder"');
    expect(about).toContain(`https://www.deskzenapp.com${FOUNDER_PHOTO_SRC}`);
    expect(JSON.stringify(jsonLd('/contact'))).toContain('"ContactPage"');
    const article = JSON.stringify(jsonLd('/learn/afternoon-slump'));
    expect(article).toContain('https://www.deskzenapp.com/about#alok-paryani');
    expect(article).toContain('/site/og/afternoon-slump.png');
    expect(article).not.toContain('DeskZen team');
  });

  it('adds keep reading links on the two older guides', () => {
    const slouch = render(createElement(StopSlouchingPage));
    const slump = render(createElement(AfternoonSlumpPage));
    expect(slouch).toContain('Keep reading');
    expect(slouch).toContain('href="/learn/stand-up-and-stretch-reminders"');
    expect(slouch).toContain('href="/learn/private-posture-reminder"');
    expect(slouch).toContain('Alok Paryani, Founder');
    expect(slouch).toContain('/site/og/stop-slouching.png');
    expect(slump).toContain('Keep reading');
    expect(slump).toContain('href="/webcam-posture-checker"');
    expect(slump).toContain('href="/learn/slouch-detector-vs-sit-up-timer"');
    expect(slump).toContain('href="/learn/private-posture-reminder"');
    expect(slump).toContain('/site/og/afternoon-slump.png');
  });

  it('stores contact notes as insert-only', () => {
    const sql = readFileSync('supabase/migrations/20261124150000_contact_messages.sql', 'utf8').toLowerCase();
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('grant insert (name, email, message)');
    expect(sql).toContain('for insert');
    expect(sql).not.toContain('for select');
    expect(sql).not.toContain('for update');
    expect(sql).not.toContain('for delete');
    expect(sql).toContain('rate_limited');
    const fn = readFileSync('supabase/functions/notify-contact/index.ts', 'utf8');
    expect(fn).not.toContain('sales@');
    expect(fn).toContain('CONTACT_TO_EMAIL');
    expect(fn).toContain('RESEND_API_KEY');
    expect(fn).not.toContain('service_role');
    const clientFiles = readdirSync('src', { recursive: true })
      .map(String)
      .filter((name) => (name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.test.ts'));
    for (const name of clientFiles) {
      const text = readFileSync(`src/${name}`, 'utf8');
      expect(text.toLowerCase(), name).not.toContain('sales@');
    }
  });
});
