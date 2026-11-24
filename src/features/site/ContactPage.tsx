import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ContactSection } from './ContactForm';
import { PAGE_ART } from './pageArt';
import { ProductFigure } from './GuidePage';
import { SitePage, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';

export function ContactPage() {
  useEffect(() => {
    document.title = PAGE_META['/contact'].title;
  }, []);

  const art = PAGE_ART['/contact'];

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
              Contact
            </li>
          </ol>
        </nav>
        <ContactSection heading="h1" className="mt-6" />
        <ProductFigure src={art.src} alt={art.alt} width={art.width} height={art.height} caption={art.caption} />
        <p className="mt-10 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
      </article>
    </SitePage>
  );
}
