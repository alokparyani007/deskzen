import { describe, expect, it } from 'vitest';
import { destinationAfterZen } from './afterZen';

describe('after the first Zen is saved', () => {
  it('sends a guest from the public site straight to Live view', () => {
    expect(destinationAfterZen({ signedIn: false, from: null })).toBe('/live');
    expect(destinationAfterZen({ signedIn: false, from: '' })).toBe('/live');
  });

  it('keeps the done step when they came from inside the app or they are signed in', () => {
    expect(destinationAfterZen({ signedIn: false, from: 'settings' })).toBe('done');
    expect(destinationAfterZen({ signedIn: false, from: 'live' })).toBe('done');
    expect(destinationAfterZen({ signedIn: true, from: null })).toBe('done');
  });
});
