import { useSyncExternalStore } from 'react';
import { createStubAuth } from './stub';
import type { AuthAdapter, AuthSession } from './types';

export type { AuthAdapter, AuthResult, AuthSession, AuthUser } from './types';
export { isValidEmail } from './stub';

/**
 * The one sign-in adapter the app uses.
 *
 * Today: a local stub. In dev (npm run dev) it lets you straight into the app.
 * A production build only allows it when VITE_AUTH_STUB=true (for preview deploys).
 *
 * TODO(supabase):
 *  1. npm i @supabase/supabase-js
 *  2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Vercel project env + .env.local)
 *  3. Create src/lib/auth/supabase.ts implementing AuthAdapter with supabase.auth
 *     (signInWithOAuth for Google/Apple, signInWithOtp for the email link,
 *     onAuthStateChange for subscribe, getSession for the cached session)
 *  4. Pick it here when the env vars are present, and keep the stub for tests.
 *  5. In Supabase: enable Google (and later Apple), and add
 *     https://<your-domain>/app and http://localhost:5173/app as redirect URLs.
 */
export const auth: AuthAdapter = createStubAuth({
  allowed: import.meta.env.DEV || import.meta.env.VITE_AUTH_STUB === 'true',
});

/** Where people land after signing in. */
export const AFTER_SIGN_IN = '/app';

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
