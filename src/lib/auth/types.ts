/** A signed-in person. Kept small on purpose: DeskZen keeps posture data on the device. */
export type AuthUser = {
  id: string;
  email: string | null;
  provider: AuthProvider;
};

export type AuthProvider = 'google' | 'apple' | 'email' | 'dev';

export type AuthSession = {
  user: AuthUser;
  /** When this session was created, in ms since epoch. */
  createdAt: number;
};

export type AuthResult =
  | { ok: true; session: AuthSession | null; message?: string }
  | { ok: false; error: string };

/**
 * Everything the UI needs from sign-in. The login page only talks to this,
 * so swapping the stub for Supabase does not touch any screens.
 */
export type AuthAdapter = {
  /** True while sign-in is a local stub (no real accounts yet). */
  readonly isStub: boolean;
  /** False until the saved session (or a magic-link return) has been read. */
  isReady(): boolean;
  getSession(): AuthSession | null;
  signInWithGoogle(): Promise<AuthResult>;
  /** Apple comes later. Kept here so the UI and adapter stay in step. */
  signInWithApple(): Promise<AuthResult>;
  /** Sends a magic link. The stub signs you in right away in dev. */
  sendMagicLink(email: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  subscribe(listener: () => void): () => void;
  /** A friendly message if a sign-in link or redirect came back with an error. Shown once per page load. */
  takeRedirectError(): string | null;
};
