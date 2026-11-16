import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trackUsage } from '../usage/track';
import { CHECK_EMAIL, GOOGLE_COMING_SOON, createSupabaseAuth, friendlyError, readRedirectError } from './supabase';

vi.mock('../usage/track', () => ({ trackUsage: vi.fn() }));

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
const session = { user: { id: 'u1', email: 'maya@example.com', app_metadata: { provider: 'email' }, created_at: '2026-11-03T00:00:00Z' } };

describe('supabase auth adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

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
    emit('SIGNED_IN', session);
    expect(a.isReady()).toBe(true);
    expect(a.getSession()?.user).toEqual({ id: 'u1', email: 'maya@example.com', provider: 'email' });
    expect(trackUsage).not.toHaveBeenCalled();
    await a.signOut();
    expect(a.getSession()).toBeNull();
    expect(calls.some((c) => c.name === 'signOut')).toBe(true);
    expect(changes).toBeGreaterThanOrEqual(2);
  });

  it('counts a completed sign-in once when this page opened from a magic link', () => {
    vi.stubGlobal('window', { location: { href: 'https://deskzenapp.com/app#access_token=a&refresh_token=b&type=magiclink' } });
    const { client, emit } = fakeClient();
    const a = createSupabaseAuth({ ...base, client });
    emit('INITIAL_SESSION', session);
    emit('SIGNED_IN', session);
    expect(trackUsage).toHaveBeenCalledTimes(1);
    expect(trackUsage).toHaveBeenCalledWith('sign_in_completed');
    expect(a.getSession()?.user.email).toBe('maya@example.com');
  });

  it('does not count a restored session or an expired link', () => {
    vi.stubGlobal('window', { location: { href: 'https://deskzenapp.com/app' } });
    const restored = fakeClient();
    createSupabaseAuth({ ...base, client: restored.client });
    restored.emit('SIGNED_IN', session);
    expect(trackUsage).not.toHaveBeenCalled();

    vi.stubGlobal('window', {
      location: { href: 'https://deskzenapp.com/app#error=access_denied&error_code=otp_expired&error_description=expired' },
    });
    const expired = fakeClient();
    createSupabaseAuth({ ...base, client: expired.client });
    expired.emit('SIGNED_IN', session);
    expect(trackUsage).not.toHaveBeenCalled();
  });

  it('explains expired magic links from the redirect', () => {
    expect(readRedirectError('https://deskzenapp.com/app#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toContain('expired');
    expect(readRedirectError('https://deskzenapp.com/app')).toBeNull();
    expect(friendlyError('Unsupported provider: provider is not enabled')).toBe(GOOGLE_COMING_SOON);
  });
});
