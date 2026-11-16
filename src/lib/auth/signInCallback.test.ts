import { describe, expect, it } from 'vitest';
import { isSignInCallback } from './signInCallback';

describe('sign-in callback detection', () => {
  it('recognizes a successful magic-link hash and a PKCE return', () => {
    expect(isSignInCallback('https://deskzenapp.com/app#access_token=a&refresh_token=b&type=magiclink')).toBe(true);
    expect(isSignInCallback('https://deskzenapp.com/app?code=abc', true)).toBe(true);
  });

  it('ignores ordinary visits, errors, and a code with no verifier', () => {
    expect(isSignInCallback('https://deskzenapp.com/app')).toBe(false);
    expect(isSignInCallback('https://deskzenapp.com/login?email=maya@example.com')).toBe(false);
    expect(isSignInCallback('https://deskzenapp.com/app?code=abc', false)).toBe(false);
    expect(
      isSignInCallback(
        'https://deskzenapp.com/app#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid',
      ),
    ).toBe(false);
    expect(isSignInCallback('not a url')).toBe(false);
  });
});