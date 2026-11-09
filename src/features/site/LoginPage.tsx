import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AFTER_SIGN_IN, auth, isValidEmail, stubAllowed, useAuthSession } from '../../lib/auth';
import type { AuthResult } from '../../lib/auth';
import { CONTACT_EMAIL, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';

type Busy = 'google' | 'email' | null;

export function LoginPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const emailId = useId();
  const statusId = useId();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<Busy>(null);
  // e.g. an expired magic link sends people back here with a reason.
  const [error, setError] = useState<string | null>(() => auth.takeRedirectError());
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    document.title = PAGE_META['/login'].title;
  }, []);

  function finish(result: AuthResult): void {
    setBusy(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.session) {
      navigate(AFTER_SIGN_IN);
      return;
    }
    // Real magic link: the session arrives when they tap the link in their email.
    setNotice(result.message ?? 'Check your email for a sign-in link.');
  }

  async function google(): Promise<void> {
    setError(null);
    setNotice(null);
    setBusy('google');
    finish(await auth.signInWithGoogle());
  }

  async function sendLink(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy('email');
    finish(await auth.sendMagicLink(email));
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#060807] px-5 py-12 text-white antialiased">
      <Backdrop />
      <main className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/12 bg-white/[0.04] px-6 py-9 shadow-[0_0_60px_rgb(5_150_105/0.18)] backdrop-blur-sm sm:px-9">
          <Link to="/" aria-label="DeskZen home" className={`mx-auto block w-fit rounded-2xl ${siteFocus}`}>
            <img src="/brand/deskzen-icon.svg" alt="" width={64} height={64} className="size-16" />
          </Link>
          <h1 className="mt-5 text-center text-[1.7rem] font-semibold tracking-tight sm:text-3xl">Welcome to DeskZen</h1>
          <p className="mt-2 text-center text-white/70">Sign in or create your free account.</p>

          {session ? (
            <p className="mt-5 rounded-xl border border-outline/30 bg-print/10 px-4 py-3 text-center text-sm text-brand-tint">
              You&rsquo;re signed in.{' '}
              <Link to={AFTER_SIGN_IN} className={`rounded font-semibold text-outline underline-offset-2 hover:underline ${siteFocus}`}>
                Open the app
              </Link>
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void google()}
            disabled={busy !== null}
            className={`mt-7 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-semibold text-desk transition hover:bg-white/90 disabled:opacity-60 ${siteFocus}`}
          >
            <GoogleMark />
            {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </button>

          <div className="my-6 flex items-center gap-4 text-sm text-white/50" role="separator" aria-label="or">
            <span className="h-px flex-1 bg-white/12" />
            or
            <span className="h-px flex-1 bg-white/12" />
          </div>

          <form onSubmit={(e) => void sendLink(e)} noValidate>
            <label htmlFor={emailId} className="block text-sm font-medium text-white/85">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error !== null && busy === null ? true : undefined}
              aria-describedby={statusId}
              className={`mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-white placeholder:text-white/40 focus:border-outline/70 ${siteFocus}`}
            />
            <button
              type="submit"
              disabled={busy !== null}
              className={`mt-4 w-full rounded-xl bg-print px-4 py-3 font-semibold text-white shadow-[0_0_24px_rgb(5_150_105/0.35)] transition hover:bg-brand-light disabled:opacity-60 ${siteFocus}`}
            >
              {busy === 'email' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>

          <div id={statusId} aria-live="polite" className="min-h-0">
            {error ? <p className="mt-4 text-center text-sm text-amber-300">{error}</p> : null}
            {notice ? <p className="mt-4 text-center text-sm text-outline">{notice}</p> : null}
          </div>

          <p className="mt-6 flex items-start justify-center gap-2 text-center text-xs text-white/60">
            <ShieldCheck className="mt-px size-4 shrink-0 text-outline/80" aria-hidden="true" />
            <span>Your camera stays on your device. Photos and video are never saved or uploaded.</span>
          </p>
          <p className="mt-4 flex justify-center gap-6 text-sm text-white/70">
            <Link to="/privacy" className={`rounded hover:text-white ${siteFocus}`}>Privacy</Link>
            <Link to="/terms" className={`rounded hover:text-white ${siteFocus}`}>Terms</Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className={`rounded hover:text-white ${siteFocus}`}>Contact</a>
          </p>
          {auth.isStub && stubAllowed ? (
            <p className="mt-5 text-center text-xs text-white/40">Preview: accounts aren&rsquo;t connected yet, so this opens the app on this device.</p>
          ) : null}
        </div>
        <p className="mt-6 text-center text-sm text-white/55">DeskZen is a wellness tool, not a medical device.</p>
      </main>
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-print/20 blur-3xl" />
      <Profile className="absolute -left-24 top-1/2 hidden h-[80vh] -translate-y-1/2 md:block" />
      <Profile className="absolute -right-24 top-1/2 hidden h-[80vh] -translate-y-1/2 -scale-x-100 md:block" />
    </div>
  );
}

/** A faint glowing head-and-shoulders line, like the Live view outline. */
function Profile({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 300 600"
      className={className}
      fill="none"
      style={{ maskImage: 'linear-gradient(to bottom, transparent 18%, black 40%, black 70%, transparent 95%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 18%, black 40%, black 70%, transparent 95%)' }}
    >
      <path
        d="M40 600 C40 520 90 470 150 455 C165 450 170 430 165 410 C160 395 150 390 150 375 C150 365 160 362 160 352 C160 345 150 340 152 332 C154 325 165 322 162 312 C158 300 165 290 172 286 C180 280 175 262 178 245 C185 190 230 150 270 150"
        stroke="#34d399"
        strokeOpacity="0.35"
        strokeWidth="2"
        style={{ filter: 'drop-shadow(0 0 6px rgb(52 211 153 / 0.6))' }}
      />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
