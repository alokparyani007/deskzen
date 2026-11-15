import { describe, expect, it } from 'vitest';
import { SETUP_BLURB, SETUP_TIME, SETUP_TIME_LEAD, ZEN_SETUP_INTRO } from './setupTime';

describe('setup time copy', () => {
  it('uses one duration everywhere we describe Set my Zen', () => {
    expect(SETUP_TIME_LEAD.toLowerCase()).toBe(SETUP_TIME);
    expect(SETUP_BLURB.toLowerCase()).toContain(SETUP_TIME);
    expect(ZEN_SETUP_INTRO.toLowerCase()).toContain(SETUP_TIME);
    const copy = `${SETUP_BLURB} ${ZEN_SETUP_INTRO}`;
    expect(copy).not.toMatch(/20 seconds|a minute/i);
  });
});
