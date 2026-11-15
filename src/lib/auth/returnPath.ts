import { AFTER_SIGN_IN } from './index';
import { isAppPath } from '../../features/site/enterApp';

const KEY = 'deskzen.auth.return';
const MAX_AGE_MS = 60 * 60 * 1000;

type Memory = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type Stored = { path: string; at: number };

/** An in-app path only. Rejects other sites, public pages, and protocol tricks. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\') || trimmed.includes('://')) return null;
  let url: URL;
  try {
    url = new URL(trimmed, 'https://deskzenapp.com');
  } catch {
    return null;
  }
  if (url.origin !== 'https://deskzenapp.com') return null;
  if (!isAppPath(url.pathname)) return null;
  return `${url.pathname}${url.search}`;
}

/** Query `from` wins, then router state, then the usual post-sign-in page. */
export function returnPathFrom(searchFrom: string | null, stateFrom: unknown, fallback: string = AFTER_SIGN_IN): string {
  return safeReturnPath(searchFrom) ?? (typeof stateFrom === 'string' ? safeReturnPath(stateFrom) : null) ?? safeReturnPath(fallback) ?? AFTER_SIGN_IN;
}

/** Remember where to come back after an email link. The default home needs no extra hop. */
export function rememberReturnPath(path: string, storage: Memory = localStorage, now: number = Date.now()): void {
  const safe = safeReturnPath(path);
  if (!safe || safe === AFTER_SIGN_IN) return;
  try {
    const stored: Stored = { path: safe, at: now };
    storage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Private mode: the magic link still opens the app home.
  }
}

export function peekReturnPath(storage: Pick<Storage, 'getItem'> = localStorage, now: number = Date.now()): string | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored>;
    if (typeof parsed.at !== 'number' || now - parsed.at > MAX_AGE_MS) return null;
    return safeReturnPath(typeof parsed.path === 'string' ? parsed.path : null);
  } catch {
    return null;
  }
}

export function clearReturnPath(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}
