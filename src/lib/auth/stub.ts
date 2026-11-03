import type { AuthAdapter, AuthProvider, AuthResult, AuthSession } from './types';

const KEY = 'deskzen.auth.stub';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Basic shape check so a typo does not send a link to nowhere. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/**
 * Local stand-in for real sign-in. When `allowed` is true it "signs you in"
 * by saving a small marker in this browser, then the app opens. When false
 * (a production build without Supabase) it says sign-in isn't ready yet.
 *
 * Real accounts live in ./supabase.ts; ./index.ts picks it when
 * VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.
 */
export function createStubAuth(options: { allowed: boolean; storage?: StorageLike | null; now?: () => number }): AuthAdapter {
  const storage = options.storage === undefined ? safeStorage() : options.storage;
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let memory: AuthSession | null = null;

  function read(): AuthSession | null {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthSession;
      return parsed && parsed.user && typeof parsed.user.id === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  function write(session: AuthSession | null): void {
    memory = session;
    if (storage) {
      try {
        if (session) storage.setItem(KEY, JSON.stringify(session));
        else storage.removeItem(KEY);
      } catch {
        // Private mode or full storage: keep it in memory for this visit.
      }
    }
    listeners.forEach((fn) => fn());
  }

  function signIn(provider: AuthProvider, email: string | null): AuthResult {
    if (!options.allowed) {
      return { ok: false, error: "Sign-in isn't available yet. We're opening accounts soon." };
    }
    const session: AuthSession = { user: { id: `local-${provider}`, email, provider }, createdAt: now() };
    write(session);
    return { ok: true, session };
  }

  return {
    isStub: true,
    isReady: () => true,
    getSession: read,
    takeRedirectError: () => null,
    async signInWithGoogle() {
      return signIn('google', null);
    },
    async signInWithApple() {
      return { ok: false, error: 'Apple sign-in is coming soon.' };
    },
    async sendMagicLink(email: string) {
      if (!isValidEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
      return signIn('email', email.trim());
    },
    async signOut() {
      write(null);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function safeStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
