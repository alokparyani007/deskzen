import { describe, expect, it } from 'vitest';
import { HOME_PRIMARY_EVENT, trackHomePrimary } from './homePrimary';

describe('home primary button tracking', () => {
  it('counts try now and sends a Google Analytics event with the destination', () => {
    const usage: string[] = [];
    const ga: unknown[][] = [];
    trackHomePrimary('/set-my-zen', {
      track: (event) => usage.push(event),
      gtag: (...args) => {
        ga.push(args);
      },
    });
    trackHomePrimary('/live', {
      track: (event) => usage.push(event),
      gtag: (...args) => {
        ga.push(args);
      },
    });
    expect(usage).toEqual(['try_now_click', 'try_now_click']);
    expect(ga).toEqual([
      ['event', HOME_PRIMARY_EVENT, { destination: '/set-my-zen' }],
      ['event', HOME_PRIMARY_EVENT, { destination: '/live' }],
    ]);
  });

  it('still returns when counting or analytics throws', () => {
    expect(() =>
      trackHomePrimary('/set-my-zen', {
        track: () => {
          throw new Error('offline');
        },
        gtag: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
