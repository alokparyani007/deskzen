import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../lib/auth';

/** Contact address used across the public site. */
export const CONTACT_EMAIL = 'sales@deskzenapp.com';

export const siteFocus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

/** Big emerald call to action with a soft glow. White text on #047857 for WCAG AA contrast. */
export const ctaClass = `inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-[0_0_32px_rgb(5_150_105/0.45)] ring-1 ring-outline/40 transition hover:bg-callout hover:shadow-[0_0_44px_rgb(5_150_105/0.55)] ${siteFocus}`;

/** First-time flow. A plain link so the browser loads app.html, which has no analytics. */
export const TRY_PATH = '/set-my-zen';
export const TRY_LABEL = 'Try it now, no sign-up';
export const OPEN_LABEL = 'Open DeskZen';

const headerCtaClass = `inline-flex min-h-11 items-center whitespace-nowrap rounded-xl bg-brand px-3.5 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgb(5_150_105/0.45)] ring-1 ring-outline/40 hover:bg-callout sm:px-4 ${siteFocus}`;

export function TryLink({ className = ctaClass, children = TRY_LABEL }: { className?: string; children?: ReactNode }) {
  return (
    <a href={TRY_PATH} className={className}>
      {children}
    </a>
  );
}

export function OpenAppLink({ className = ctaClass, href = '/app', children = OPEN_LABEL }: { className?: string; href?: string; children?: ReactNode }) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function SiteLogo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" aria-label="DeskZen home" className={`inline-flex items-center gap-2.5 rounded-lg ${siteFocus} ${className}`}>
      <img src="/brand/deskzen-icon.svg" alt="" width={36} height={36} className="size-9 shrink-0" />
      <span className="text-xl font-semibold tracking-tight text-white">
        Desk<span className="text-outline">Zen</span>
      </span>
    </Link>
  );
}

export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="relative z-20">
      <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-8 sm:py-5">
        <SiteLogo />
        <div className="flex items-center gap-2 sm:gap-4">
          {signedIn ? (
            <OpenAppLink className={headerCtaClass} />
          ) : (
            <>
              <Link
                to="/login"
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 py-2 text-sm font-medium text-white/80 hover:text-white sm:px-3 ${siteFocus}`}
              >
                Log in
              </Link>
              <TryLink className={headerCtaClass}>Try it now</TryLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#040505]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-8 sm:flex-row sm:justify-between sm:px-8">
        <SiteLogo />
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/75">
            <li>
              <Link to="/learn" className={`inline-flex min-h-11 items-center rounded hover:text-white ${siteFocus}`}>
                Learn
              </Link>
            </li>
            <li>
              <Link to="/privacy" className={`inline-flex min-h-11 items-center rounded hover:text-white ${siteFocus}`}>
                Privacy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={`inline-flex min-h-11 items-center rounded hover:text-white ${siteFocus}`}>
                Terms
              </Link>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className={`inline-flex min-h-11 items-center rounded hover:text-white ${siteFocus}`}>
                Contact
              </a>
            </li>
            <li>@deskzenapp</li>
          </ul>
          <p className="text-xs text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
        </div>
      </div>
    </footer>
  );
}

/** Near-black page with the site nav and footer. */
export function SitePage({ children, signedIn }: { children: ReactNode; signedIn?: boolean }) {
  const detected = useAuthSession() !== null;
  const open = signedIn ?? detected;
  return (
    <div className="min-h-dvh bg-[#060807] text-white antialiased">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-desk">
        Skip to content
      </a>
      <SiteNav signedIn={open} />
      <main id="content">{children}</main>
      <SiteFooter />
    </div>
  );
}
