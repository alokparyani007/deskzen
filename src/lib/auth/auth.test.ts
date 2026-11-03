import { describe, expect, it } from 'vitest';
import { createStubAuth, isValidEmail } from './stub';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

describe('stub auth adapter', () => {
  it('signs in with Google in dev and remembers the session', async () => {
    const storage = memoryStorage();
    const a = createStubAuth({ allowed: true, storage, now: () => 5 });
    expect(a.getSession()).toBeNull();
    const result = await a.signInWithGoogle();
    expect(result.ok).toBe(true);
    expect(a.getSession()?.user.provider).toBe('google');
    // A fresh adapter on the same storage sees the same session.
    expect(createStubAuth({ allowed: true, storage }).getSession()?.createdAt).toBe(5);
  });

  it('checks the email before sending a link', async () => {
    const a = createStubAuth({ allowed: true, storage: memoryStorage() });
    expect(await a.sendMagicLink('nope')).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    const ok = await a.sendMagicLink(' maya@example.com ');
    expect(ok.ok).toBe(true);
    expect(a.getSession()?.user.email).toBe('maya@example.com');
  });

  it('refuses to sign in when the stub is not allowed (production without Supabase)', async () => {
    const a = createStubAuth({ allowed: false, storage: memoryStorage() });
    const result = await a.signInWithGoogle();
    expect(result.ok).toBe(false);
    expect(a.getSession()).toBeNull();
  });

  it('keeps Apple off for now', async () => {
    const a = createStubAuth({ allowed: true, storage: memoryStorage() });
    expect((await a.signInWithApple()).ok).toBe(false);
  });

  it('signs out and tells listeners', async () => {
    const a = createStubAuth({ allowed: true, storage: memoryStorage() });
    let calls = 0;
    const off = a.subscribe(() => (calls += 1));
    await a.signInWithGoogle();
    await a.signOut();
    off();
    expect(calls).toBe(2);
    expect(a.getSession()).toBeNull();
  });

  it('validates emails', () => {
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
