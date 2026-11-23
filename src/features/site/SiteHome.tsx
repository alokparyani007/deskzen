import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Bell, ChevronDown, Laptop, PersonStanding, ShieldCheck } from 'lucide-react';
import { useAuthSession } from '../../lib/auth';
import { SitePage, siteFocus } from './SiteChrome';
import { trackHomePrimary, type HomePrimaryPath } from './homePrimary';
import { FAQS, PAGE_META } from './seo';
import { useSavedZen } from './useSavedZen';

const SITE_TITLE = PAGE_META['/'].title;

const START_LABEL = 'Start free, no sign-up';
const LIVE_LABEL = 'Open Live view';
const RESET_LABEL = 'Reset my Zen';
const START_PATH = '/set-my-zen';
const LIVE_PATH = '/live';

const PRIVACY_LINE = 'Runs on your device. No video saved.';

const steps: readonly { icon: LucideIcon; title: string; body: string }[] = [
  { icon: PersonStanding, title: 'Set my Zen', body: 'Sit your best once. DeskZen learns your outline.' },
  { icon: Laptop, title: 'Work as usual', body: 'Leave the camera on and get on with your day.' },
  { icon: Bell, title: 'Get a gentle nudge when you slouch', body: 'A quiet tip shows up. Then you are back to work.' },
];

const primaryClass = `inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-brand px-8 py-4 text-lg font-semibold text-white shadow-[0_0_32px_rgb(5_150_105/0.45)] ring-1 ring-white/10 transition hover:bg-callout hover:shadow-[0_0_44px_rgb(5_150_105/0.55)] ${siteFocus}`;

const secondaryClass = `inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/25 px-6 py-3 text-base font-semibold text-brand-tint transition hover:bg-white/10 ${siteFocus}`;

export function SiteHome({ signedIn, hasZen }: { signedIn?: boolean; hasZen?: boolean } = {}) {
  const detected = useAuthSession() !== null;
  const open = signedIn ?? detected;
  const zen = useSavedZen(hasZen);
  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  return (
    <SitePage signedIn={open} headerAction={false}>
      <Hero zen={zen} />
      <HowItWorks />
      <Privacy />
      <Faq />
      <BottomBand zen={zen} />
    </SitePage>
  );
}

function Hero({ zen }: { zen: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden px-5 pt-2 pb-10 sm:px-8 sm:pt-8 sm:pb-16">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-24 h-72 w-[42rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-print/20 blur-3xl" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-print">Posture and break reminders for your desk</p>
        <h1 id="hero-title" className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-tight text-white sm:text-6xl">
          Gentle webcam nudges when you slouch.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-white/80 sm:text-xl">
          Set your Zen once, work as usual, and get a quiet tip when you drift. Right in your browser.
        </p>
        <PrimaryActions zen={zen} className="mt-6 sm:mt-8" />
      </div>
    </section>
  );
}

function PrimaryActions({ zen, className = '' }: { zen: boolean; className?: string }) {
  const href: HomePrimaryPath = zen ? LIVE_PATH : START_PATH;
  const label = zen ? LIVE_LABEL : START_LABEL;
  return (
    <div className={`mx-auto flex w-full max-w-md flex-col items-stretch gap-3 sm:items-center ${className}`} aria-live="polite">
      <a href={href} className={primaryClass} onClick={() => trackHomePrimary(href)}>
        {label}
      </a>
      {zen ? (
        <a href={START_PATH} className={secondaryClass}>
          {RESET_LABEL}
        </a>
      ) : (
        <p className="text-center text-sm text-white/60">Free during early access. No credit card.</p>
      )}
      <p className="text-center text-sm font-medium text-brand-tint">{zen ? 'Your Zen is saved on this device.' : PRIVACY_LINE}</p>
    </div>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="px-5 pb-12 sm:px-8 sm:pb-16">
      <h2 id="how-title" className="text-center text-2xl font-bold tracking-tight text-white sm:text-4xl">
        How it works
      </h2>
      <ol className="mx-auto mt-6 grid max-w-5xl gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex items-start gap-4 rounded-3xl border border-white/12 bg-white/[0.03] px-4 py-4 sm:block sm:px-6 sm:py-7 sm:text-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand sm:mx-auto" aria-hidden="true">
                <Icon className="size-6" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-balance text-lg font-semibold text-white sm:mt-4">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-white/70 sm:text-base">{step.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Privacy() {
  return (
    <section aria-labelledby="privacy-title" className="px-5 pb-12 sm:px-8 sm:pb-16">
      <h2 id="privacy-title" className="sr-only">
        Privacy
      </h2>
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border border-print/40 bg-print/10 px-5 py-6 text-center sm:flex-row sm:px-8 sm:text-left">
        <ShieldCheck className="size-11 shrink-0 text-print" strokeWidth={1.5} aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold text-white sm:text-xl">{PRIVACY_LINE}</p>
          <p className="mt-1 text-sm text-brand-tint sm:text-base">Your camera never leaves your device. Photos and video stay in memory only and are never uploaded.</p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section aria-labelledby="faq-title" className="px-5 pb-12 sm:px-8 sm:pb-16">
      <h2 id="faq-title" className="text-center text-2xl font-bold tracking-tight text-white sm:text-4xl">
        Questions about DeskZen
      </h2>
      <div className="mx-auto mt-6 max-w-3xl space-y-3 sm:mt-8">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 open:border-print/40 open:bg-print/[0.06] sm:px-6 sm:py-4">
            <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg [&::-webkit-details-marker]:hidden ${siteFocus}`}>
              <h3 className="text-base font-semibold text-white sm:text-lg">{q}</h3>
              <ChevronDown className="size-5 shrink-0 text-print transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-2 pb-2 text-sm text-white/75 sm:text-base">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function BottomBand({ zen }: { zen: boolean }) {
  return (
    <section aria-labelledby="ready-title" className="border-t border-print/20 bg-gradient-to-b from-[#0b2a1f] to-[#07140f] px-5 py-10 text-center sm:px-8 sm:py-14">
      <h2 id="ready-title" className="text-2xl font-bold tracking-tight text-white sm:text-4xl">
        Ready when you are.
      </h2>
      <PrimaryActions zen={zen} className="mt-6" />
    </section>
  );
}
