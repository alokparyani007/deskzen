import type { PublicPath } from './seo';

export const WEBCAM_CHECKER_PATH = '/webcam-posture-checker' as const satisfies PublicPath;
export const MAC_WINDOWS_PATH = '/posture-reminder-mac-windows' as const satisfies PublicPath;

export const GUIDE_LINKS: readonly { href: PublicPath; title: string; text: string }[] = [
  {
    href: WEBCAM_CHECKER_PATH,
    title: 'Free webcam posture checker',
    text: 'A slouch detector in your browser. No download and no sign-up.',
  },
  {
    href: MAC_WINDOWS_PATH,
    title: 'Posture reminder for Mac and Windows',
    text: 'The same laptop reminder on a Mac or a Windows PC. Nothing to install.',
  },
  {
    href: '/learn/stop-slouching-at-your-desk',
    title: 'How to stop slouching at your desk',
    text: 'Desk setup and small habits that may help you sit taller.',
  },
  {
    href: '/learn/afternoon-slump',
    title: 'Why you crash at 3 PM',
    text: 'Why afternoons feel heavy, and simple resets that may help.',
  },
  {
    href: '/learn/slouch-detector-vs-sit-up-timer',
    title: 'Slouch detector vs a sit-up timer',
    text: 'Why a camera nudge is different from a posture timer that only rings on a clock.',
  },
  {
    href: '/learn/stand-up-and-stretch-reminders',
    title: 'Stand-up and stretch reminders',
    text: 'How to set a stand up reminder and a stretch reminder you will keep while you work.',
  },
  {
    href: '/learn/private-posture-reminder',
    title: 'A private posture reminder',
    text: 'How on-device posture checks work, and why the camera picture is never saved.',
  },
];
