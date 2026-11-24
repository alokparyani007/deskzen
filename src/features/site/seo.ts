/** Search and social metadata for the public pages. Used by the pages and the build-time prerender. */

import { PAGE_ART } from './pageArt';

export const SITE_URL = 'https://www.deskzenapp.com';
export const OG_IMAGE = `${SITE_URL}/site/deskzen-posture-reminders-og.jpg`;
export const OG_IMAGE_ALT = 'DeskZen posture reminders: a woman smiling at her laptop, with a soft green outline around her.';

export const FOUNDER_ID = `${SITE_URL}/about#alok-paryani`;

export type PublicPath =
  | '/'
  | '/privacy'
  | '/terms'
  | '/login'
  | '/about'
  | '/contact'
  | '/learn'
  | '/learn/stop-slouching-at-your-desk'
  | '/learn/afternoon-slump'
  | '/learn/slouch-detector-vs-sit-up-timer'
  | '/learn/stand-up-and-stretch-reminders'
  | '/learn/private-posture-reminder'
  | '/webcam-posture-checker'
  | '/posture-reminder-mac-windows';

export type PageMeta = { title: string; description: string; ogTitle: string; ogDescription: string };

export const PAGE_META: Record<PublicPath, PageMeta> = {
  '/': {
    title: 'DeskZen: Posture Reminders and Break App for Your Desk',
    description:
      'DeskZen is a free posture reminder app. Your webcam spots slouching and gently nudges you to sit up straight, in your browser. Video never leaves your device.',
    ogTitle: 'DeskZen: Posture Reminders and Break App for Your Desk',
    ogDescription:
      'DeskZen is a free posture reminder app. Your webcam spots slouching and gently nudges you to sit up straight, in your browser. Video never leaves your device.',
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
  '/about': {
    title: 'About Alok Paryani | DeskZen',
    description:
      'Alok Paryani, founder of DeskZen, on why he built a free posture coach that runs in your browser. The camera stays on your device.',
    ogTitle: 'About Alok Paryani | DeskZen',
    ogDescription:
      'Alok Paryani, founder of DeskZen, on why he built a free posture coach that runs in your browser. The camera stays on your device.',
  },
  '/contact': {
    title: 'Contact Alok Paryani | DeskZen',
    description: 'Write to Alok Paryani, founder of DeskZen. Share your desk day, or a way DeskZen could help you. He reads every note.',
    ogTitle: 'Contact Alok Paryani | DeskZen',
    ogDescription: 'Write to Alok Paryani, founder of DeskZen. Share your desk day, or a way DeskZen could help you. He reads every note.',
  },
  '/learn': {
    title: 'Learn | DeskZen Posture Guides',
    description:
      'Desk posture guides on slouch detectors, stand-up reminders, webcam privacy, and the 3 PM slump. From DeskZen.',
    ogTitle: 'Learn | DeskZen Posture Guides',
    ogDescription:
      'Desk posture guides on slouch detectors, stand-up reminders, webcam privacy, and the 3 PM slump. From DeskZen.',
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
    ogTitle: 'Why You Crash at 3 PM | DeskZen',
    ogDescription:
      'Why many people fade around 3 PM, how sitting and slouching may play a part, and simple habits that may help. A DeskZen guide.',
  },
  '/learn/slouch-detector-vs-sit-up-timer': {
    title: 'Webcam Slouch Detector vs a Sit-Up Timer | DeskZen',
    description:
      'A slouch detector watches how you sit. A posture timer only rings on a clock. See when a sit up straight reminder should do more.',
    ogTitle: 'Webcam Slouch Detector vs a Sit-Up Timer | DeskZen',
    ogDescription:
      'A slouch detector watches how you sit. A posture timer only rings on a clock. See when a sit up straight reminder should do more.',
  },
  '/learn/stand-up-and-stretch-reminders': {
    title: 'How to Set Stand-Up and Stretch Reminders | DeskZen',
    description:
      'Set a stand up reminder and a stretch reminder you will keep. A break reminder app routine for work, plus a nudge when you slouch.',
    ogTitle: 'How to Set Stand-Up and Stretch Reminders | DeskZen',
    ogDescription:
      'Set a stand up reminder and a stretch reminder you will keep. A break reminder app routine for work, plus a nudge when you slouch.',
  },
  '/learn/private-posture-reminder': {
    title: 'A Private Posture Reminder for Your Camera | DeskZen',
    description:
      'A private posture app with real webcam privacy. On-device posture checks stay in your browser. Photos and video are never saved or uploaded.',
    ogTitle: 'A Private Posture Reminder for Your Camera | DeskZen',
    ogDescription:
      'A private posture app with real webcam privacy. On-device posture checks stay in your browser. Photos and video are never saved or uploaded.',
  },
  '/webcam-posture-checker': {
    title: 'Free Webcam Posture Checker | DeskZen',
    description:
      'Free webcam posture checker and slouch detector. No download and no sign-up. DeskZen runs in your browser and keeps the camera on your device.',
    ogTitle: 'Free Webcam Posture Checker | DeskZen',
    ogDescription:
      'Free webcam posture checker and slouch detector. No download and no sign-up. DeskZen runs in your browser and keeps the camera on your device.',
  },
  '/posture-reminder-mac-windows': {
    title: 'Posture Reminder App for Mac and Windows | DeskZen',
    description:
      'Free posture reminder for Mac, Windows, and laptops. No download. DeskZen runs in your browser and the camera stays on your device.',
    ogTitle: 'Posture Reminder App for Mac and Windows | DeskZen',
    ogDescription:
      'Free posture reminder for Mac, Windows, and laptops. No download. DeskZen runs in your browser and the camera stays on your device.',
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

export const CHECKER_FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'Is this webcam posture checker free?',
    a: 'Yes. DeskZen is free during early access. There is no credit card and no sign-up. You can set your Zen and open Live view right in the browser.',
  },
  {
    q: 'Do I need to download an app?',
    a: 'No. DeskZen is a browser posture checker. Keep this tab open on your laptop. There is nothing to install.',
  },
  {
    q: 'Is it a free slouch detector?',
    a: 'Yes. After you sit your best once, DeskZen watches for a slouch against your own outline and gives you a nudge. It is a reminder, not a medical device, and it does not diagnose or treat anything.',
  },
  {
    q: 'Does my camera video get uploaded?',
    a: 'No. The camera stays on your device. Photos and video are never saved or uploaded. The check runs inside your browser.',
  },
  {
    q: 'Will it work on a Mac and on Windows?',
    a: 'Yes. Any modern desktop browser with a webcam is enough. The same page works on a Mac and on a Windows PC.',
  },
  {
    q: 'How is this different from a sit up straight timer?',
    a: 'A timer rings on a clock, even if you are already sitting well. DeskZen looks at your posture and nudges you when you actually slouch.',
  },
];

export const MAC_FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'Is there a posture reminder app for Mac that I do not have to install?',
    a: 'Yes. DeskZen runs in the browser on a Mac. There is no App Store download and no menu-bar install.',
  },
  {
    q: 'Does the same reminder work on Windows?',
    a: 'Yes. Open the same page on a Windows laptop. It is one posture reminder for both, with nothing to install.',
  },
  {
    q: 'Does it use my laptop webcam?',
    a: 'Yes. The laptop camera is enough. The picture is checked on your device and is never uploaded.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. You can try it with no sign-up. An account is optional, and your camera stays on your device either way.',
  },
  {
    q: 'Is DeskZen a medical device?',
    a: 'No. It is a wellness tool that helps you notice slouching. It does not diagnose or treat anything. If something hurts, talk with a health professional.',
  },
];

export const SLOUCH_TIMER_FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'What is a slouch detector?',
    a: 'A slouch detector uses your webcam to help you notice when your posture drifts from the outline you set. It is a reminder, not a medical device, and it does not diagnose or treat anything.',
  },
  {
    q: 'How is a slouch detector different from a posture timer?',
    a: 'A posture timer rings on a clock, even if you are already sitting well. A slouch detector stays quiet until your shape actually changes, then gives you a nudge.',
  },
  {
    q: 'What does a sit up straight reminder do?',
    a: 'People use that phrase for both clocks and camera nudges. A useful sit up straight reminder tells you when you have left the posture you chose, instead of only beeping on a schedule.',
  },
  {
    q: 'Does the webcam slouch detector save video?',
    a: 'No. In DeskZen the camera stays on your device. Photos and video are never saved or uploaded. The snapshot stays in memory only.',
  },
];

export const STAND_STRETCH_FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'How often should a stand up reminder go off?',
    a: 'A stand up reminder every 30 to 60 minutes is a comfortable range for a lot of desk days. In DeskZen, move breaks can be 30, 45, 60, or 90 minutes. Pick one you will actually follow, and snooze it when you are mid-thought.',
  },
  {
    q: 'What should a stretch reminder include?',
    a: 'A short stretch you can finish in about a minute: roll your shoulders, reach overhead, or stand and take a few steps. It is a habit cue, not a workout.',
  },
  {
    q: 'Can a break reminder app also watch my posture?',
    a: 'Yes. A timer can remind you to stand and stretch on a schedule, and a webcam check can nudge you when you slouch between those breaks. DeskZen does both, and the camera stays on your device.',
  },
  {
    q: 'Do I need a standing desk?',
    a: 'No. A stand up reminder can mean pushing the chair back for a minute. If you do switch between sitting and standing, DeskZen can also remind you to change position so you are not locked in one shape.',
  },
];

export const PRIVATE_POSTURE_FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'Does this private posture app upload my camera?',
    a: 'No. DeskZen checks posture inside your browser. The camera stays on your device. Photos and video are never saved or uploaded.',
  },
  {
    q: 'What does on-device posture mean?',
    a: 'The posture check runs on your computer, in the browser, with an on-device model. The snapshot stays in memory only. It is not sent to DeskZen.',
  },
  {
    q: 'Is webcam privacy the same as never storing anything?',
    a: 'The camera picture is never saved. DeskZen can keep your outline, settings, and scores in this browser, and an optional account stores an email for sign-in. Those are not photos or video. App progress is not synced to our servers today.',
  },
  {
    q: 'Can I pause the camera?',
    a: 'Yes. You can pause the camera any time. You can also clear what DeskZen saved in this browser from Settings, or by clearing site data in your browser.',
  },
];

export type ArticleSeo = {
  headline: string;
  crumb: string;
  published: string;
  modified: string;
  faqs?: readonly { q: string; a: string }[];
};

export const ARTICLE_SEO: Record<
  | '/learn/stop-slouching-at-your-desk'
  | '/learn/afternoon-slump'
  | '/learn/slouch-detector-vs-sit-up-timer'
  | '/learn/stand-up-and-stretch-reminders'
  | '/learn/private-posture-reminder',
  ArticleSeo
> = {
  '/learn/stop-slouching-at-your-desk': {
    headline: 'How to stop slouching at your desk',
    crumb: 'How to stop slouching',
    published: '2026-11-09',
    modified: '2026-11-23',
  },
  '/learn/afternoon-slump': {
    headline: 'Why you crash at 3 PM (and how your posture plays a part)',
    crumb: 'Why you crash at 3 PM',
    published: '2026-11-09',
    modified: '2026-11-23',
  },
  '/learn/slouch-detector-vs-sit-up-timer': {
    headline: "Webcam slouch detector vs a sit-up timer: what's the difference?",
    crumb: 'Slouch detector vs a timer',
    published: '2026-11-23',
    modified: '2026-11-23',
    faqs: SLOUCH_TIMER_FAQS,
  },
  '/learn/stand-up-and-stretch-reminders': {
    headline: 'How to set stand-up and stretch reminders while you work',
    crumb: 'Stand-up and stretch reminders',
    published: '2026-11-23',
    modified: '2026-11-23',
    faqs: STAND_STRETCH_FAQS,
  },
  '/learn/private-posture-reminder': {
    headline: 'A private posture reminder that never saves your camera',
    crumb: 'Private posture reminder',
    published: '2026-11-23',
    modified: '2026-11-23',
    faqs: PRIVATE_POSTURE_FAQS,
  },
};

export function pageUrl(path: PublicPath): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** Social image for a public page. Guides have their own picture. Home keeps the shared card. */
export function pageOg(path: PublicPath): { url: string; alt: string } {
  if (Object.prototype.hasOwnProperty.call(PAGE_ART, path)) {
    const art = PAGE_ART[path as keyof typeof PAGE_ART];
    return { url: `${SITE_URL}${art.src}`, alt: art.alt };
  }
  return { url: OG_IMAGE, alt: OG_IMAGE_ALT };
}

/** schema.org structured data for a page (JSON-LD). */
export function jsonLd(path: PublicPath): Record<string, unknown> {
  const org = {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'DeskZen',
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/pwa-512x512.png`,
    founder: { '@id': FOUNDER_ID },
    sameAs: ['https://x.com/deskzenapp'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: pageUrl('/contact'),
      availableLanguage: 'English',
    },
  };
  const founder = {
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name: 'Alok Paryani',
    jobTitle: 'Founder',
    url: pageUrl('/about'),
    worksFor: { '@id': org['@id'] },
  };
  const website = { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'DeskZen', url: `${SITE_URL}/`, publisher: { '@id': org['@id'] }, inLanguage: 'en-US' };
  const meta = PAGE_META[path];
  const og = pageOg(path);
  const pageType = path === '/about' ? 'AboutPage' : path === '/contact' ? 'ContactPage' : 'WebPage';
  const page = {
    '@type': pageType,
    '@id': `${pageUrl(path)}#webpage`,
    url: pageUrl(path),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': website['@id'] },
    inLanguage: 'en-US',
    primaryImageOfPage: og.url,
  };
  const graph: Record<string, unknown>[] = [org, founder, website, page];
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
      image: og.url,
      screenshot: [`${SITE_URL}/site/slouch-nudge.svg`, `${SITE_URL}/site/reminders.webp`, `${SITE_URL}/site/progress.webp`],
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
  const landingFaqs: Partial<Record<PublicPath, readonly { q: string; a: string }[]>> = {
    '/webcam-posture-checker': CHECKER_FAQS,
    '/posture-reminder-mac-windows': MAC_FAQS,
  };
  const landing = landingFaqs[path];
  if (landing) {
    const mac = path === '/posture-reminder-mac-windows';
    graph.push({
      '@type': 'SoftwareApplication',
      '@id': `${pageUrl(path)}#software`,
      name: 'DeskZen',
      url: pageUrl(path),
      description: meta.description,
      applicationCategory: 'HealthApplication',
      applicationSubCategory: 'Posture and break reminders',
      operatingSystem: mac ? 'macOS, Windows' : 'Web browser (Windows, macOS)',
      browserRequirements: 'Requires a modern browser and a webcam. No download.',
      image: og.url,
      screenshot: [`${SITE_URL}/site/slouch-nudge.svg`, `${SITE_URL}/site/reminders.webp`, `${SITE_URL}/site/progress.webp`],
      featureList: mac
        ? ['Posture reminder for Mac', 'Posture reminder for Windows', 'Laptop webcam nudges', 'Break reminders', 'No install', 'Camera stays on your device']
        : ['Webcam posture checker', 'Slouch detector', 'No download', 'No sign-up', 'Break reminders', 'Camera stays on your device'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
      publisher: { '@id': org['@id'] },
    });
    graph.push({
      '@type': 'FAQPage',
      '@id': `${pageUrl(path)}#faq`,
      mainEntity: landing.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    });
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl(path)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: mac ? 'Posture reminder for Mac and Windows' : 'Webcam posture checker', item: pageUrl(path) },
      ],
    });
  }
  if (path === '/about' || path === '/contact') {
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl(path)}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: path === '/about' ? 'About' : 'Contact', item: pageUrl(path) },
      ],
    });
  }
  if (path === '/learn' || path in ARTICLE_SEO) {
    const article = path in ARTICLE_SEO ? ARTICLE_SEO[path as keyof typeof ARTICLE_SEO] : null;
    const crumbs = article
      ? [
          { name: 'Home', item: `${SITE_URL}/` },
          { name: 'Learn', item: pageUrl('/learn') },
          { name: article.crumb, item: pageUrl(path) },
        ]
      : [
          { name: 'Home', item: `${SITE_URL}/` },
          { name: 'Learn', item: pageUrl('/learn') },
        ];
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': `${pageUrl(path)}#breadcrumb`,
      itemListElement: crumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.item,
      })),
    });
    if (article) {
      graph.push({
        '@type': 'Article',
        '@id': `${pageUrl(path)}#article`,
        headline: article.headline,
        description: meta.description,
        datePublished: article.published,
        dateModified: article.modified,
        author: { '@id': FOUNDER_ID },
        publisher: { '@id': org['@id'] },
        image: og.url,
        mainEntityOfPage: { '@id': page['@id'] },
        inLanguage: 'en-US',
      });
      if (article.faqs) {
        graph.push({
          '@type': 'FAQPage',
          '@id': `${pageUrl(path)}#faq`,
          mainEntity: article.faqs.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
        });
      }
    }
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
