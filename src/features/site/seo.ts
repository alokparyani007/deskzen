/** Search and social metadata for the public pages. Used by the pages and the build-time prerender. */

export const SITE_URL = 'https://www.deskzenapp.com';
export const OG_IMAGE = `${SITE_URL}/site/og.jpg`;
export const CONTACT = 'sales@deskzenapp.com';

export type PublicPath =
  | '/'
  | '/privacy'
  | '/terms'
  | '/login'
  | '/learn'
  | '/learn/stop-slouching-at-your-desk'
  | '/learn/afternoon-slump';

export type PageMeta = { title: string; description: string; ogTitle: string; ogDescription: string };

export const PAGE_META: Record<PublicPath, PageMeta> = {
  '/': {
    title: 'DeskZen: Posture Reminders and Break App for Your Desk',
    description:
      'DeskZen is a free posture reminder and break app. Your webcam spots slouching and gently nudges you to sit up straight, right in your browser. Video never leaves your device.',
    ogTitle: 'DeskZen: Feel better by 3 PM',
    ogDescription:
      'Gentle posture nudges and break reminders, right in your browser. Your camera never leaves your device. Free during early access.',
  },
  '/privacy': {
    title: 'Privacy Policy | DeskZen Posture App',
    description:
      'How DeskZen protects your privacy: posture checks run inside your browser, and photos and video from your webcam are never saved or uploaded.',
    ogTitle: 'DeskZen Privacy Policy',
    ogDescription: 'Posture checks run in your browser. Photos and video are never saved or uploaded.',
  },
  '/terms': {
    title: 'Terms of Use | DeskZen Posture App',
    description:
      'Terms for using DeskZen, the free posture and break reminder app for your desk. DeskZen is a wellness tool, not a medical device.',
    ogTitle: 'DeskZen Terms of Use',
    ogDescription: 'Terms for using DeskZen during early access. A wellness tool, not a medical device.',
  },
  '/login': {
    title: 'Log in or Sign Up | DeskZen',
    description: 'Try DeskZen with no sign-up, or sign in with an email link. Free during early access. Your camera stays on your device.',
    ogTitle: 'Log in to DeskZen',
    ogDescription: 'Try it with no sign-up, or sign in with an email link.',
  },
  '/learn': {
    title: 'Learn | DeskZen Posture Guides',
    description:
      'Friendly guides on slouching, the 3 PM slump, and desk habits that may help. From DeskZen, a free posture reminder app.',
    ogTitle: 'Learn with DeskZen',
    ogDescription: 'Friendly guides on slouching, the 3 PM slump, and desk habits that may help.',
  },
  '/learn/stop-slouching-at-your-desk': {
    title: 'How to Stop Slouching at Your Desk | DeskZen',
    description:
      'Practical desk setup and habits that may help you sit taller and slouch less. From DeskZen, a free posture reminder app for your browser.',
    ogTitle: 'How to stop slouching at your desk',
    ogDescription: 'Desk setup and daily habits that may help you sit taller, without turning it into a chore.',
  },
  '/learn/afternoon-slump': {
    title: 'Why You Crash at 3 PM | DeskZen',
    description:
      'Why many people fade around 3 PM, how sitting and slouching may play a part, and simple habits that may help. A DeskZen guide.',
    ogTitle: 'Why you crash at 3 PM',
    ogDescription: 'Why afternoons feel heavy, how sitting may play a part, and simple resets that may help.',
  },
};

export const FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'How does DeskZen check my posture?',
    a: 'Sit your best once to set your Zen, your personal posture outline. Then DeskZen watches through your webcam, right in your browser, and gives you a gentle nudge when you slouch or drift.',
  },
  {
    q: 'Is my camera video saved or uploaded?',
    a: 'Never. Your camera is checked on your device, inside your browser. No photos or video are saved or sent anywhere. DeskZen counts anonymous usage events, like started Live view, with no personal info and no camera data.',
  },
  {
    q: 'Does DeskZen remind me to take breaks?',
    a: 'Yes. It nudges you to move, stretch, rest your eyes and drink water. Tap Done or Snooze, and quiet hours keep it silent when you need to focus.',
  },
  {
    q: 'Do I need an account to start?',
    a: 'No. Try it now with no sign-up. Set your Zen and open Live view right in your browser. Sign-in is optional, and your camera stays on your device.',
  },
  {
    q: 'Is DeskZen free?',
    a: 'Yes, it\u2019s free during early access, with no credit card and no sign-up required. An account is optional.',
  },
  {
    q: 'Does it work on Mac and Windows?',
    a: 'Yes. All you need is a modern desktop browser and a webcam. There\u2019s nothing to install.',
  },
  {
    q: 'Is DeskZen a medical device?',
    a: 'No. DeskZen is a wellness tool with general posture and break tips. It doesn\u2019t diagnose or treat anything. If something hurts, talk to a health professional.',
  },
];

export function pageUrl(path: PublicPath): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** schema.org structured data for a page (JSON-LD). */
export function jsonLd(path: PublicPath): Record<string, unknown> {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'DeskZen',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/pwa-512x512.png`,
    email: CONTACT,
    sameAs: ['https://x.com/deskzenapp'],
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: CONTACT, availableLanguage: 'English' },
  };
  const website = { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'DeskZen', url: `${SITE_URL}/`, publisher: { '@id': org['@id'] }, inLanguage: 'en-US' };
  const meta = PAGE_META[path];
  const page = {
    '@type': 'WebPage',
    '@id': `${pageUrl(path)}#webpage`,
    url: pageUrl(path),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': website['@id'] },
    inLanguage: 'en-US',
  };
  const graph: Record<string, unknown>[] = [org, website, page];
  if (path === '/') {
    graph.push({
      '@type': 'WebApplication',
      '@id': `${SITE_URL}/#app`,
      name: 'DeskZen',
      url: `${SITE_URL}/`,
      description: meta.description,
      applicationCategory: 'HealthApplication',
      applicationSubCategory: 'Posture and break reminders',
      operatingSystem: 'Web browser (Windows, macOS)',
      browserRequirements: 'Requires a modern browser and a webcam.',
      image: OG_IMAGE,
      screenshot: [`${SITE_URL}/site/reminders.webp`, `${SITE_URL}/site/progress.webp`],
      featureList: ['Webcam posture reminders', 'Sit up straight nudges', 'Break reminders', 'Stretch and eye breaks', 'Weekly progress tracker', 'Runs on your device'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      publisher: { '@id': org['@id'] },
    });
    graph.push({
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: FAQS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
  }
  const articleHeadline: Partial<Record<PublicPath, string>> = {
    '/learn/stop-slouching-at-your-desk': 'How to stop slouching at your desk',
    '/learn/afternoon-slump': 'Why you crash at 3 PM (and how your posture plays a part)',
  };
  const headline = articleHeadline[path];
  if (headline) {
    graph.push({
      '@type': 'Article',
      '@id': `${pageUrl(path)}#article`,
      headline,
      description: meta.description,
      datePublished: '2026-11-09',
      dateModified: '2026-11-09',
      author: { '@id': org['@id'] },
      publisher: { '@id': org['@id'] },
      image: OG_IMAGE,
      mainEntityOfPage: { '@id': page['@id'] },
      inLanguage: 'en-US',
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
