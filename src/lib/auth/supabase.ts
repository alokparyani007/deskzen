import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { trackUsage } from '../usage/track';
import { isSignInCallback } from './signInCallback';
import { isValidEmail } from './stub';
import type { AuthAdapter, AuthProvider, AuthResult, AuthSession } from './types';

export const GOOGLE_COMING_SOON = 'Google sign-in is coming soon, use email for now.';
export const CHECK_EMAIL = 'Check your email for a sign-in link.';

type Options = {
  url: string;
  anonKey: string;
  /** Where people land after signing in, e.g. "/app". */
  redirectPath: string;
  /** For tests. Defaults to window.location.origin. */
  origin?: () => string;
  /** For tests. */
  client?: SupabaseClient;
  /** For tests: probes the OAuth URL before leaving the page. */
  fetcher?: typeof fetch;
  /** For tests. Defaults to window.location.assign. */
  navigate?: (url: string) => void;
};

/** Real sign-in with Supabase Auth: Google (OAuth) and email magic links. */
export function createSupabaseAuth(options: Options): AuthAdapter {
  const origin = options.origin ?? (() => window.location.origin);
  const redirectTo = () => `${origin()}${options.redirectPath}`;
  const navigate = options.navigate ?? ((url: string) => window.location.assign(url));
  const fetcher = options.fetcher ?? (typeof fetch === 'function' ? fetch.bind(globalThis) : undefined);
  // Read before the client strips the hash, so an expired link can be explained.
  let redirectError = readRedirectError();
  // Same moment: a successful magic link is still in the URL. A restored session is not.
  let countThisSignIn = thisLoadCompletedSignIn();

  const client =
    options.client ??
    createClient(options.url, options.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

  const listeners = new Set<() => void>();
  let ready = false;
  let current: AuthSession | null = null;

  function set(session: Session | null): void {
    current = toAuthSession(session);
    ready = true;
    listeners.forEach((fn) => fn());
  }

  // INITIAL_SESSION fires once the saved session and any magic-link hash are read.
  client.auth.onAuthStateChange((event, session) => {
    set(session);
    if (!countThisSignIn || !session) return;
    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
    countThisSignIn = false;
    trackUsage('sign_in_completed');
  });
  void client.auth
    .getSession()
    .then(({ data, error }) => {
      if (error && !redirectError) redirectError = friendlyError(error.message);
      if (!ready) set(data.session);
    })
    .catch(() => {
      if (!ready) set(null);
    });

  return {
    isStub: false,
    isReady: () => ready,
    getSession: () => current,
    async signInWithGoogle(): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo(), skipBrowserRedirect: true },
      });
      if (error || !data.url) return { ok: false, error: friendlyError(error?.message ?? '') };
      // Check the provider is switched on first, so people never land on a raw error page.
      if (fetcher) {
        try {
          const probe = await fetcher(data.url, { redirect: 'manual' });
          if (probe.status >= 400) {
            const body = await probe.text().catch(() => '');
            return { ok: false, error: isProviderDisabled(body) ? GOOGLE_COMING_SOON : friendlyError(body) };
          }
        } catch {
          // Network hiccup on the probe: try the real redirect anyway.
        }
      }
      navigate(data.url);
      return { ok: true, session: null, message: 'Opening Google…' };
    },
    async signInWithApple() {
      return { ok: false, error: 'Apple sign-in is coming soon.' };
    },
    async sendMagicLink(email: string): Promise<AuthResult> {
      if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirectTo(), shouldCreateUser: true },
      });
      if (error) return { ok: false, error: friendlyError(error.message, error.status) };
      return { ok: true, session: null, message: CHECK_EMAIL };
    },
    async signOut() {
      try {
        await client.auth.signOut();
      } finally {
        set(null);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    takeRedirectError() {
      const message = redirectError;
      // Cleared after this tick, so React's double render in dev still sees it.
      if (message) setTimeout(() => (redirectError = null), 0);
      return message;
    },
  };
}

function thisLoadCompletedSignIn(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    return isSignInCallback(window.location.href, pkceVerifierStored());
  } catch {
    return false;
  }
}

/** True when this browser still has the PKCE verifier Supabase saved before the redirect. The value is not read. */
function pkceVerifierStored(): boolean {
  try {
    const raw = import.meta.env.VITE_SUPABASE_URL?.trim();
    if (!raw || typeof localStorage === 'undefined') return false;
    const ref = new URL(raw).hostname.split('.')[0];
    if (!ref) return false;
    return localStorage.getItem(`sb-${ref}-auth-token-code-verifier`) !== null;
  } catch {
    return false;
  }
}

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  const raw = session.user.app_metadata?.provider;
  const provider: AuthProvider = raw === 'google' || raw === 'apple' ? raw : 'email';
  const created = Date.parse(session.user.last_sign_in_at ?? session.user.created_at ?? '');
  return {
    user: { id: session.user.id, email: session.user.email ?? null, provider },
    createdAt: Number.isFinite(created) ? created : 0,
  };
}

export function isProviderDisabled(message: string): boolean {
  return /provider is not enabled|unsupported provider/i.test(message);
}

/** Turns Supabase's error text into something calm and useful. */
export function friendlyError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (isProviderDisabled(message)) return GOOGLE_COMING_SOON;
  if (status === 429 || m.includes('rate limit') || m.includes('security purposes') || m.includes('too many'))
    return 'Too many sign-in emails just now. Please wait a minute and try again.';
  if (m.includes('expired') || (m.includes('invalid') && m.includes('link')))
    return 'That sign-in link has expired or was already used. Please request a new one.';
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return "New accounts aren't open yet. Please check back soon.";
  if (m.includes('email address') && m.includes('invalid')) return 'Please enter a valid email address.';
  if (m.includes('failed to fetch') || m.includes('network')) return "We couldn't reach the sign-in service. Check your connection and try again.";
  return 'Something went wrong signing you in. Please try again.';
}

/** Reads `error_description` from a redirect back (hash or query), e.g. an expired magic link. */
export function readRedirectError(href?: string): string | null {
  let url: URL;
  try {
    url = new URL(href ?? window.location.href);
  } catch {
    return null;
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const code = hash.get('error_code') ?? url.searchParams.get('error_code') ?? '';
  const description = hash.get('error_description') ?? url.searchParams.get('error_description');
  if (!description && !code) return null;
  if (code === 'otp_expired') return 'That sign-in link has expired or was already used. Please request a new one.';
  return friendlyError(`${code} ${description ?? ''}`);
}
