import { Link } from 'react-router-dom';
import { GUIDE_LINKS } from './guideLinks';
import { setZenClass, siteFocus, SitePage } from './SiteChrome';

const textLink = `rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`;

/** Friendly missing page. The build serves this HTML with a real 404 status. */
export function NotFoundPage() {
  return (
    <SitePage headerAction={false}>
      <article className="mx-auto max-w-xl px-5 py-16 text-center sm:px-8 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-print">404</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">We cannot find that page</h1>
        <p className="mt-4 text-lg text-white/75">
          The address may be mistyped, or the page may have moved. DeskZen is a free posture reminder app that runs in your browser.
        </p>
        <div className="mt-8">
          <a href="/set-my-zen" className={setZenClass}>
            Set my Zen
          </a>
          <p className="mt-3 text-sm text-white/60">No sign-up. Your camera stays on your device.</p>
        </div>
        <ul className="mt-10 space-y-3 text-left">
          <li>
            <Link to="/" className={`block rounded-2xl border border-white/15 px-4 py-4 hover:border-outline/40 ${siteFocus}`}>
              <span className="font-semibold text-white">Home</span>
              <span className="mt-1 block text-sm text-white/70">Posture reminders and break tips for your desk.</span>
            </Link>
          </li>
          {GUIDE_LINKS.slice(0, 2).map((item) => (
            <li key={item.href}>
              <Link to={item.href} className={`block rounded-2xl border border-white/15 px-4 py-4 hover:border-outline/40 ${siteFocus}`}>
                <span className="font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-sm text-white/70">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-white/60">
          Or read the{' '}
          <Link to="/learn" className={textLink}>
            Learn
          </Link>{' '}
          guides.
        </p>
      </article>
    </SitePage>
  );
}
