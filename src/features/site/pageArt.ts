/** Unique illustration for each public guide. The PNG is also the page og:image. */

export type PageArt = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
};

export const PAGE_ART = {
  '/about': {
    src: '/site/og/about.png',
    width: 1200,
    height: 630,
    alt: 'DeskZen brand mark: an emerald seated figure on a mint circle, beside the DeskZen name.',
    caption: 'DeskZen, a free posture coach that runs in your browser.',
  },
  '/contact': {
    src: '/site/og/contact.png',
    width: 1200,
    height: 630,
    alt: 'A mint envelope with an emerald flap, and the words Write to Alok.',
    caption: 'A note comes straight to Alok.',
  },
  '/learn': {
    src: '/site/og/learn.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman at a desk reading posture guides on a laptop, with a green outline around her.',
    caption: 'Short guides for people who sit at a desk.',
  },
  '/learn/stop-slouching-at-your-desk': {
    src: '/site/og/stop-slouching.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman sitting tall at a desk, screen near eye level, with a green outline around her shoulders.',
    caption: 'Sit tall, with the screen near eye level. The green line is a guide, not a stiff pose.',
  },
  '/learn/afternoon-slump': {
    src: '/site/og/afternoon-slump.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman leaning toward her laptop at 3:00, with an amber slouch label and a glass of water on the desk.',
    caption: 'An afternoon lean, marked in amber, with water close by.',
  },
  '/learn/slouch-detector-vs-sit-up-timer': {
    src: '/site/og/slouch-detector.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a round timer beside a woman at a laptop, with a green outline showing a posture check instead of a clock.',
    caption: 'A timer rings on a clock. An outline waits until your posture changes.',
  },
  '/learn/stand-up-and-stretch-reminders': {
    src: '/site/og/stand-stretch.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman standing and reaching both arms overhead beside a small plant.',
    caption: 'One minute to stand and reach, then sit back down when you are ready.',
  },
  '/learn/private-posture-reminder': {
    src: '/site/og/private-posture.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman at a laptop with a shield, and the words On this device and Nothing uploaded.',
    caption: 'A drawing, not a photo. The check stays on the laptop.',
  },
  '/webcam-posture-checker': {
    src: '/site/og/webcam-checker.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman at a laptop webcam posture check, with a green camera-on dot and a green outline.',
    caption: 'A drawing of the check. The camera picture stays on the computer.',
  },
  '/posture-reminder-mac-windows': {
    src: '/site/og/mac-windows.png',
    width: 1200,
    height: 630,
    alt: 'Illustration of a woman between two laptops, with the same posture reminder on each screen.',
    caption: 'The same browser reminder on two laptops. Nothing to install on either one.',
  },
} as const satisfies Record<string, PageArt>;

export type ArtPath = keyof typeof PAGE_ART;

export function artForPath(path: string): PageArt | null {
  if (!Object.prototype.hasOwnProperty.call(PAGE_ART, path)) return null;
  return PAGE_ART[path as ArtPath];
}
