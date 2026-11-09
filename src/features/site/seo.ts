/** Search and social metadata for the public pages. Used by the pages and the build-time prerender. */

export const SITE_URL = 'https://www.deskzenapp.com';
export const OG_IMAGE = `${SITE_URL}/site/og.jpg`;
export const CONTACT = 'sales@deskzenapp.com';

export type PublicPath = '/' | '/privacy' | '/terms' | '/login';

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
    description: 'Sign in to DeskZen with an email link and start getting gentle posture and break reminders at your desk. Free during early access.',
    ogTitle: 'Log in to DeskZen',
    ogDescription: 'Sign in with an email link. Free during early access.',
  },
};

export const FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'How does DeskZen check my posture?',
    a: 'First you sit your best once to set your Zen, a personal outline of your good posture. While DeskZen runs, it uses your webcam and an on-device model inside your browser to compare how you sit with that outline. When you slouch or drift, you get a gentle nudge to sit up straight.',
  },
  {
    q: 'Is my camera video saved or uploaded?',
    a: 'No. The camera picture is checked inside your browser and never leaves your device. Photos and video are never saved or uploaded.',
  },
  {
    q: 'Does DeskZen remind me to take breaks?',
    a: 'Yes. Break reminders nudge you to move, stretch, rest your eyes and drink water. Mark a break done or snooze it in one tap, and quiet hours keep reminders silent when you need focus.',
  },
  {
    q: 'Is DeskZen free?',
    a: 'Yes. DeskZen is free during early access, and you don\u2019t need a credit card to sign up.',
  },
  {
    q: 'Does it work on Mac and Windows?',
    a: 'Yes. DeskZen runs in a modern desktop browser on Mac or Windows with a built-in or USB webcam. There is nothing to install.',
  },
  {
    q: 'Is DeskZen a medical device?',
    a: 'No. DeskZen is a wellness tool, not a medical device. It offers general posture and break tips and does not diagnose or treat any condition. If something hurts, please talk to a health professional.',
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
  return { '@context': 'https://schema.org', '@graph': graph };
}
