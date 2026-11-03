import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { MinuteRecord } from '../../lib/progress/aggregate';
import { ProgressView, type ProgressViewProps } from './ProgressView';

const now = Date.parse('2026-11-03T12:00:00-06:00');

function render(props: Partial<ProgressViewProps>): string {
  const full: ProgressViewProps = {
    minutes: [],
    dayCounts: [],
    timeZone: 'America/Chicago',
    nowMs: now,
    name: 'Maya',
    period: 'week',
    onPeriod: () => {},
    details: false,
    onToggleDetails: () => {},
    ...props,
  };
  return renderToString(createElement(MemoryRouter, null, createElement(ProgressView, full)));
}

function minutes(startIso: string, count: number, score: number): MinuteRecord[] {
  const start = Math.floor(Date.parse(startIso) / 60_000);
  return Array.from({ length: count }, (_, index) => ({ minute: start + index, score, mode: 'sit' as const }));
}

describe('progress page', () => {
  it('renders the empty state', () => {
    const html = render({});
    expect(html).toContain('Your progress shows up after your first session');
    expect(html).toContain('Start Live view');
    expect(html).not.toContain('See details');
  });

  it('renders the score story with details collapsed', () => {
    const data = [...minutes('2026-10-22T10:00:00-05:00', 60, 78), ...minutes('2026-11-03T09:00:00-06:00', 60, 84)];
    const html = render({ minutes: data });
    expect(html).toContain('Up 6 from last week');
    expect(html).toContain('Weekly score');
    expect(html).toContain('Sitting well');
    expect(html).toContain('Breaks per day');
    expect(html).toContain('Slouch time');
    expect(html).toContain('See details');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('This week vs last week');
    expect(html).toContain('DeskZen is a wellness tool, not a medical device.');
  });

  it('renders details when open, and a first-week start with no previous data', () => {
    const html = render({ minutes: minutes('2026-11-03T09:00:00-06:00', 60, 84), details: true });
    expect(html).toContain('First week, nice start');
    expect(html).toContain('This week vs last week');
    expect(html).toContain('How you spent your time');
    expect(html).toContain('Sitting and standing');
    expect(html).toContain('Best hour');
    expect(html).toContain('Streak');
  });
});
