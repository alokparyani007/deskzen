import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { GUIDE_LINKS } from './guideLinks';
import { PAGE_META } from './seo';
import type { PublicPath } from './seo';
import { setZenClass, siteFocus, SitePage } from './SiteChrome';

const textLink = `rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`;

export function ProductFigure({
  src,
  alt,
  width,
  height,
  caption,
  loading = 'lazy',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
  loading?: 'lazy' | 'eager';
}) {
  return (
    <figure className="my-8">
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding="async"
        className="h-auto w-full rounded-2xl border border-white/10 bg-stage"
      />
      <figcaption className="mt-2 text-sm text-white/60">{caption}</figcaption>
    </figure>
  );
}

function SetZenBlock() {
  return (
    <div className="mt-6">
      <a href="/set-my-zen" className={setZenClass}>
        Set my Zen
      </a>
      <p className="mt-3 text-sm text-white/70">No sign-up. No download. Your camera stays on your device.</p>
    </div>
  );
}

function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <section aria-labelledby="guide-faq-title" className="mt-12">
      <h2 id="guide-faq-title" className="text-2xl font-semibold text-white">
        Questions
      </h2>
      <div className="mt-4 space-y-3">
        {items.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-3 open:border-print/40 open:bg-print/[0.06] sm:px-5">
            <summary className={`flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-lg [&::-webkit-details-marker]:hidden ${siteFocus}`}>
              <h3 className="text-base font-semibold text-white">{q}</h3>
              <ChevronDown className="size-5 shrink-0 text-print transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="mt-2 pb-2 text-sm text-white/75 sm:text-base">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function RelatedGuides({ current }: { current: PublicPath }) {
  const items = GUIDE_LINKS.filter((item) => item.href !== current);
  return (
    <section aria-labelledby="related-title" className="mt-12">
      <h2 id="related-title" className="text-2xl font-semibold text-white">
        Keep going
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link to={item.href} className={`block rounded-2xl border border-white/15 px-4 py-4 hover:border-outline/40 hover:bg-print/[0.06] ${siteFocus}`}>
              <span className="font-semibold text-white">{item.title}</span>
              <span className="mt-1 block text-sm text-white/70">{item.text}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white/70">
        More desk guides are on the{' '}
        <Link to="/learn" className={textLink}>
          Learn
        </Link>{' '}
        page. The camera rules are in the{' '}
        <Link to="/privacy" className={textLink}>
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}

/** Shared shell for the long-form public landing pages. */
export function GuidePage({
  path,
  crumb,
  title,
  lede,
  faqs,
  children,
}: {
  path: PublicPath;
  crumb: string;
  title: string;
  lede: string;
  faqs: readonly { q: string; a: string }[];
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = PAGE_META[path].title;
  }, [path]);

  return (
    <SitePage headerAction={false}>
      <article className="mx-auto max-w-3xl px-5 pb-16 pt-4 sm:px-8 sm:pt-8">
        <p className="text-sm font-semibold text-print">
          <Link to="/" className={`rounded ${siteFocus}`}>
            Home
          </Link>
          <span aria-hidden="true"> / </span>
          {crumb}
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-white/80">{lede}</p>
        <SetZenBlock />
        <div className="mt-10 space-y-4 text-base leading-7 text-white/80 [&_h2]:pt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-white [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <FaqList items={faqs} />
        <RelatedGuides current={path} />
        <div className="mt-12 rounded-3xl border border-outline/40 bg-print/[0.06] px-6 py-8 text-center">
          <h2 className="text-2xl font-semibold text-white">Ready when you are</h2>
          <p className="mx-auto mt-2 max-w-md text-white/75">Set your Zen once. About 30 seconds, then you are back to work.</p>
          <SetZenBlock />
        </div>
        <p className="mt-8 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
      </article>
    </SitePage>
  );
}
