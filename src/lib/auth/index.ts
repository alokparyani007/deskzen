import { useSyncExternalStore } from 'react';
import { createStubAuth } from './stub';
import { createSupabaseAuth } from './supabase';
import type { AuthAdapter, AuthSession } from './types';

export type { AuthAdapter, AuthResult, AuthSession, AuthUser } from './types';
export { isValidEmail } from './stub';

/** Where people land after signing in. */
export const AFTER_SIGN_IN = '/app';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** True when this build talks to real Supabase accounts (never in unit tests). */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) && import.meta.env.MODE !== 'test';

/**
 * The local stub is allowed in dev (npm run dev) and in a production build only
 * when VITE_AUTH_STUB=true (for preview deploys). It is only used when Supabase
 * isn't configured.
 */
export const stubAllowed = import.meta.env.DEV || import.meta.env.VITE_AUTH_STUB === 'true';

/**
 * The one sign-in adapter the app uses.
 *
 * With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set (see .env.production and
 * .env.local): real Supabase Auth, with Google and email magic links.
 * Without them: the local stub (lets you straight in during dev, says
 * "not available yet" in a production build).
 */
export const auth: AuthAdapter = supabaseConfigured
  ? createSupabaseAuth({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY, redirectPath: AFTER_SIGN_IN })
  : createStubAuth({ allowed: stubAllowed });

let cachedSession: AuthSession | null = null;
let cachedKey = '';

function snapshot(): AuthSession | null {
  const next = auth.getSession();
  const key = next ? `${next.user.id}:${next.createdAt}` : '';
  if (key !== cachedKey) {
    cachedKey = key;
    cachedSession = next;
  }
  return cachedSession;
}

/** Current session, re-rendering when it changes. */
export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(auth.subscribe, snapshot, () => null);
}

/** False until the saved session (or a magic-link return) has been read. */
export function useAuthReady(): boolean {
  return useSyncExternalStore(auth.subscribe, () => auth.isReady(), () => false);
}
