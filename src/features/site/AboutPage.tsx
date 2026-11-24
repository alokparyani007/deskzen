import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ContactSection } from './ContactForm';
import {
  ABOUT_CTA_AFTER_TELL,
  ABOUT_CTA_BEFORE_TELL,
  ABOUT_CTA_BUTTON,
  ABOUT_CTA_HEADING,
  ABOUT_CTA_LEAD,
  ABOUT_CTA_TELL,
  FOUNDER_HEADING,
  FOUNDER_PARAGRAPHS,
  FOUNDER_SIGN_NAME,
  FOUNDER_SIGN_ROLE,
} from './founderCopy';
import { PAGE_ART } from './pageArt';
import { ProductFigure } from './GuidePage';
import { SitePage, TryLink, ctaClass, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';

const textLink = `rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`;

export function AboutPage() {
  useEffect(() => {
    document.title = PAGE_META['/about'].title;
  }, []);

  const art = PAGE_ART['/about'];

  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-sm font-semibold text-print">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link to="/" className={`rounded ${siteFocus}`}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-white/80">
              About
            </li>
          </ol>
        </nav>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{FOUNDER_HEADING}</h1>
        <ProductFigure src={art.src} alt={art.alt} width={art.width} height={art.height} caption={art.caption} loading="eager" />
        <div className="mt-8 space-y-5 text-base leading-7 text-white/80">
          {FOUNDER_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-8 font-semibold text-white">{FOUNDER_SIGN_NAME}</p>
        <p className="text-white/70">{FOUNDER_SIGN_ROLE}</p>
        <section aria-labelledby="about-try-title" className="mt-12">
          <h2 id="about-try-title" className="text-2xl font-semibold tracking-tight text-white">
            {ABOUT_CTA_HEADING}
          </h2>
          <div className="mt-4 space-y-4 text-base leading-7 text-white/80">
            <p>{ABOUT_CTA_LEAD}</p>
            <p>
              {ABOUT_CTA_BEFORE_TELL}
              <a href="#contact-form" className={textLink}>
                {ABOUT_CTA_TELL}
              </a>
              {ABOUT_CTA_AFTER_TELL}
            </p>
          </div>
          <TryLink className={`${ctaClass} mt-6`}>{ABOUT_CTA_BUTTON}</TryLink>
        </section>
        <ContactSection id="contact-form" />
        <p className="mt-10 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
      </article>
    </SitePage>
  );
}
