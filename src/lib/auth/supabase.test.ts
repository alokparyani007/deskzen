import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { CHECK_EMAIL, GOOGLE_COMING_SOON, createSupabaseAuth, friendlyError, readRedirectError } from './supabase';

type Call = { name: string; args: unknown };

function fakeClient(overrides: { otpError?: { message: string; status?: number } } = {}) {
  const calls: Call[] = [];
  let listener: ((event: string, session: unknown) => void) | null = null;
  const client = {
    auth: {
      onAuthStateChange(fn: (event: string, session: unknown) => void) {
        listener = fn;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
      async signInWithOAuth(args: unknown) {
        calls.push({ name: 'oauth', args });
        return { data: { url: 'https://ref.supabase.co/auth/v1/authorize?provider=google' }, error: null };
      },
      async signInWithOtp(args: unknown) {
        calls.push({ name: 'otp', args });
        return { data: {}, error: overrides.otpError ?? null };
      },
      async signOut() {
        calls.push({ name: 'signOut', args: null });
        return { error: null };
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls, emit: (e: string, s: unknown) => listener?.(e, s) };
}

const base = { url: 'https://ref.supabase.co', anonKey: 'anon', redirectPath: '/app', origin: () => 'https://deskzenapp.com' };

describe('supabase auth adapter', () => {
  it('sends a magic link back to /app and asks them to check email', async () => {
    const { client, calls } = fakeClient();
    const a = createSupabaseAuth({ ...base, client });
    expect(await a.sendMagicLink('nope')).toEqual({ ok: false, error: 'Please enter a valid email address.' });
    const result = await a.sendMagicLink(' maya@example.com ');
    expect(result).toEqual({ ok: true, session: null, message: CHECK_EMAIL });
    expect(calls[0]).toEqual({
      name: 'otp',
      args: { email: 'maya@example.com', options: { emailRedirectTo: 'https://deskzenapp.com/app', shouldCreateUser: true } },
    });
  });

  it('shows a friendly error when emails are rate limited', async () => {
    const { client } = fakeClient({ otpError: { message: 'email rate limit exceeded', status: 429 } });
    const a = createSupabaseAuth({ ...base, client });
    const result = await a.sendMagicLink('maya@example.com');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain('Too many sign-in emails');
  });

  it('says Google is coming soon when the provider is not enabled', async () => {
    const { client, calls } = fakeClient();
    const visited: string[] = [];
    const fetcher = (async () =>
      new Response('{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}', { status: 400 })) as typeof fetch;
    const a = createSupabaseAuth({ ...base, client, fetcher, navigate: (u) => visited.push(u) });
    expect(await a.signInWithGoogle()).toEqual({ ok: false, error: GOOGLE_COMING_SOON });
    expect(visited).toEqual([]);
    expect(calls[0]).toEqual({ name: 'oauth', args: { provider: 'google', options: { redirectTo: 'https://deskzenapp.com/app', skipBrowserRedirect: true } } });
  });

  it('goes to Google when the provider is on', async () => {
    const { client } = fakeClient();
    const visited: string[] = [];
    const fetcher = (async () => new Response(null, { status: 200 })) as typeof fetch;
    const a = createSupabaseAuth({ ...base, client, fetcher, navigate: (u) => visited.push(u) });
    expect((await a.signInWithGoogle()).ok).toBe(true);
    expect(visited).toEqual(['https://ref.supabase.co/auth/v1/authorize?provider=google']);
  });

  it('tracks the session from auth events and signs out', async () => {
    const { client, calls, emit } = fakeClient();
    const a = createSupabaseAuth({ ...base, client });
    let changes = 0;
    a.subscribe(() => (changes += 1));
    emit('SIGNED_IN', { user: { id: 'u1', email: 'maya@example.com', app_metadata: { provider: 'email' }, created_at: '2026-11-03T00:00:00Z' } });
    expect(a.isReady()).toBe(true);
    expect(a.getSession()?.user).toEqual({ id: 'u1', email: 'maya@example.com', provider: 'email' });
    await a.signOut();
    expect(a.getSession()).toBeNull();
    expect(calls.some((c) => c.name === 'signOut')).toBe(true);
    expect(changes).toBeGreaterThanOrEqual(2);
  });

  it('explains expired magic links from the redirect', () => {
    expect(readRedirectError('https://deskzenapp.com/app#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toContain('expired');
    expect(readRedirectError('https://deskzenapp.com/app')).toBeNull();
    expect(friendlyError('Unsupported provider: provider is not enabled')).toBe(GOOGLE_COMING_SOON);
  });
});
