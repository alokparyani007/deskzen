import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Check, ChevronDown, Clock, Gift, Globe, MousePointerClick, PersonStanding, ShieldCheck, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../lib/auth';
import { SETUP_BLURB } from '../../lib/copy/setupTime';
import { BrowserFrame } from './BrowserFrame';
import { OpenAppLink, SitePage, TryLink, siteFocus } from './SiteChrome';
import { FAQS, PAGE_META } from './seo';

export const SITE_TITLE = PAGE_META['/'].title;

type Benefit = { icon: LucideIcon; title: string; body: string };

export const benefits: readonly Benefit[] = [
  { icon: PersonStanding, title: 'Feel less stiff', body: 'Sit tall without thinking about it.' },
  { icon: Zap, title: 'More energy', body: 'Break reminders that fit your day.' },
  { icon: Clock, title: 'Nudges, not nagging', body: 'One kind tip at a time.' },
];

export const steps = [
  { title: 'Set my Zen', body: 'Sit your best once.' },
  { title: 'Live view', body: 'Get a gentle nudge when you drift.' },
  { title: 'Progress', body: 'Watch your score grow.' },
] as const;

const badges: readonly { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: 'Works in your browser' },
  { icon: MousePointerClick, label: 'Nothing to install' },
  { icon: Gift, label: 'Free during early access' },
];

export function SiteHome({ signedIn }: { signedIn?: boolean } = {}) {
  const detected = useAuthSession() !== null;
  const open = signedIn ?? detected;
  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  return (
    <SitePage signedIn={open}>
      <Hero signedIn={open} />
      <Benefits />
      <SeeItInAction />
      <Cta signedIn={open} className="pt-4 pb-20 sm:pb-24" />
      <HowItWorks />
      <Privacy />
      <Faq />
      <BottomBand signedIn={open} />
    </SitePage>
  );
}

function Cta({ className = '', signedIn = false }: { className?: string; signedIn?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 px-5 ${className}`}>
      {signedIn ? <OpenAppLink /> : <TryLink />}
      <p className="text-sm text-white/60">{signedIn ? 'Your setup stays on this device.' : SETUP_BLURB}</p>
      {signedIn ? null : (
        <Link to="/login" className={`inline-flex min-h-11 items-center rounded text-sm font-semibold text-white/80 underline underline-offset-2 hover:text-white ${siteFocus}`}>
          Sign in
        </Link>
      )}
    </div>
  );
}

function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden px-5 pt-6 pb-14 sm:px-8 sm:pt-10">
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-40 h-[28rem] w-[56rem] max-w-[140vw] -translate-x-1/2 rounded-full bg-print/15 blur-3xl" />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-outline">Posture and break reminders for your desk</p>
        <h1 id="hero-title" className="mt-4 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Feel better by 3 PM.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-outline sm:text-xl">
          Gentle posture nudges that help you sit tall, take breaks, and keep your energy all workday.
        </p>
        <Cta className="mt-8" signedIn={signedIn} />
      </div>
      <HeroShot />
    </section>
  );
}

function HeroShot() {
  return (
    <figure className="relative mx-auto mt-12 max-w-4xl">
      <div aria-hidden="true" className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-print/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-[#0d1512] shadow-2xl">
        <img
          src="/site/hero-maya.webp"
          srcSet="/site/hero-maya-800.webp 800w, /site/hero-maya.webp 1280w"
          sizes="(min-width: 1024px) 896px, 100vw"
          width={1280}
          height={720}
          alt="A woman smiling at her laptop desk, with a soft green DeskZen posture outline showing she is sitting up straight"
          fetchPriority="high"
          className="block aspect-video h-auto w-full object-cover"
        />
        <ScoreBadge score={96} />
        <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur sm:right-5 sm:top-5 sm:text-sm">
          On track
        </span>
        <figcaption className="bg-black/70 py-2.5 text-center text-sm font-medium text-white sm:text-base">
          Nice, you&rsquo;re in your Zen
        </figcaption>
      </div>
    </figure>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="absolute left-3 top-3 grid size-14 place-items-center rounded-full bg-black/60 backdrop-blur sm:left-5 sm:top-5 sm:size-16" role="img" aria-label={`Posture score ${score} percent`}>
      <svg viewBox="0 0 52 52" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(c * score) / 100} ${c}`} />
      </svg>
      <span className="relative text-sm font-semibold text-white sm:text-base">{score}%</span>
    </span>
  );
}

function Benefits() {
  return (
    <section aria-labelledby="benefits-title" className="px-5 pb-10 sm:px-8">
      <h2 id="benefits-title" className="sr-only">Benefits of posture and break reminders at your desk</h2>
      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-5">
        {benefits.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex items-center gap-4 rounded-3xl border border-white/15 bg-white/[0.03] px-5 py-5 sm:block sm:px-6 sm:py-7 sm:text-center">
            <Icon className="size-8 shrink-0 text-outline sm:mx-auto sm:size-9" strokeWidth={1.75} aria-hidden="true" />
            <div>
              <h3 className="text-lg font-semibold text-white sm:mt-4 sm:text-xl">{title}</h3>
              <p className="mt-0.5 text-outline/90 sm:mt-1.5">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckPill({ children }: { children: string }) {
  return (
    <li className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1.5 pl-1.5 pr-4 text-sm text-brand-tint">
      <span className="grid size-6 place-items-center rounded-full bg-print/40">
        <Check className="size-3.5 text-outline" strokeWidth={3} aria-hidden="true" />
      </span>
      {children}
    </li>
  );
}

function Feature({ id, title, body, points, shot }: { id: string; title: string; body: string; points: readonly string[]; shot: { src: string; width: number; height: number; alt: string } }) {
  return (
    <div className="mt-16 sm:mt-20">
      <div className="text-center">
        <h3 id={id} className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h3>
        <p className="mx-auto mt-3 max-w-xl text-lg text-white/65">{body}</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-2.5" aria-label={`${title} highlights`}>
          {points.map((p) => (
            <CheckPill key={p}>{p}</CheckPill>
          ))}
        </ul>
      </div>
      <div className="mt-8 sm:mt-10">
        <BrowserFrame {...shot} />
      </div>
    </div>
  );
}

function SeeItInAction() {
  return (
    <section aria-labelledby="action-title" className="px-5 pt-14 pb-16 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-outline">See it in action</p>
          <h2 id="action-title" className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Breaks and progress, built in
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/65">
            This is the real DeskZen app: your day and your week at a glance.
          </p>
        </div>
        <Feature
          id="feature-breaks"
          title="Break reminders"
          body="Gentle reminders to move, stretch and drink water."
          points={['Your day on one dial', 'Done or Snooze in one tap', 'Quiet hours stay quiet']}
          shot={{ src: '/site/reminders.webp', width: 1150, height: 498, alt: 'DeskZen Reminders: a day dial counting down to the next break, and a Today list with Done and Snooze buttons' }}
        />
        <Feature
          id="feature-progress"
          title="Progress tracker"
          body="See your week get better, with a simple score."
          points={['Weekly score', 'Breaks and slouch time', 'This week vs last week']}
          shot={{ src: '/site/progress.webp', width: 1138, height: 763, alt: 'DeskZen Progress: a weekly score of 84, up 6 from last week, with sitting, breaks and slouch tiles and a weekly chart' }}
        />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="px-5 pb-16 sm:px-8">
      <h2 id="how-title" className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        How DeskZen helps you sit up straight
      </h2>
      <ol className="mx-auto mt-10 grid max-w-4xl gap-10 sm:grid-cols-3 sm:gap-6">
        {steps.map((step, i) => (
          <li key={step.title} className="text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full border-2 border-outline/80 text-xl font-semibold text-outline shadow-[0_0_24px_rgb(52_211_153/0.35)]" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="mt-4 text-xl font-semibold text-white">
              <span className="sr-only">Step {i + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-1 text-outline/90">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Privacy() {
  return (
    <section aria-labelledby="privacy-title" className="px-5 pb-20 sm:px-8">
      <h2 id="privacy-title" className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Private posture checks
      </h2>
      <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-5 rounded-3xl border border-outline/40 bg-print/[0.06] px-6 py-7 text-center shadow-[0_0_40px_rgb(5_150_105/0.25)] sm:flex-row sm:px-8 sm:text-left">
        <ShieldCheck className="size-12 shrink-0 text-outline" strokeWidth={1.5} aria-hidden="true" />
        <div>
          <p className="text-xl font-semibold text-white">Your camera never leaves your device.</p>
          <p className="mt-1 text-outline/90">Photos and video are never saved or uploaded.</p>
        </div>
      </div>
      <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
        {badges.map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/85">
            <Icon className="size-4 text-outline" aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq() {
  return (
    <section aria-labelledby="faq-title" className="px-5 pb-20 sm:px-8">
      <h2 id="faq-title" className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Questions about DeskZen
      </h2>
      <div className="mx-auto mt-8 max-w-3xl space-y-3">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-white/15 bg-white/[0.03] px-5 py-4 open:border-outline/40 open:bg-print/[0.06] sm:px-6">
            <summary className={`flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg [&::-webkit-details-marker]:hidden ${siteFocus}`}>
              <h3 className="text-lg font-semibold text-white">{q}</h3>
              <ChevronDown className="size-5 shrink-0 text-outline transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-outline/90">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function BottomBand({ signedIn }: { signedIn: boolean }) {
  return (
    <section aria-labelledby="ready-title" className="border-t border-outline/20 bg-gradient-to-b from-[#0b2a1f] to-[#07140f] px-5 py-14 text-center sm:px-8">
      <h2 id="ready-title" className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Ready to feel better at your desk?
      </h2>
      <Cta className="mt-7" signedIn={signedIn} />
    </section>
  );
}

