import { describe, expect, it } from 'vitest';
import { formatScore, greetingForHour } from './home';

describe('formatScore', () => {
  it('shows a whole number without a percent sign', () => {
    expect(formatScore(84)).toBe('84');
    expect(formatScore(84)).not.toContain('%');
    expect(formatScore(84.6)).toBe('85');
    expect(formatScore(-4)).toBe('0');
    expect(formatScore(140)).toBe('100');
  });
});

describe('greetingForHour', () => {
  it('picks a time of day', () => {
    expect(greetingForHour(8)).toBe('Good morning');
    expect(greetingForHour(14)).toBe('Good afternoon');
    expect(greetingForHour(19)).toBe('Good evening');
  });
});
