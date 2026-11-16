import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedbackCard } from '../feedback/FeedbackCard';
import { DockButton, ZenDock } from './ZenDock';
import { PostureSidePanel } from './PostureSidePanel';
import { StepPill } from './ZenStage';
import { zenConfig } from './zenConfig';
import {
  FIT_SAVE_ANYWAY_MS,
  fitSaveAnywayReady,
  openLiveView,
  stepPillClass,
  zenDockClass,
  zenHeaderClass,
  zenSnapGridClass,
} from './stageLayout';

describe('phone layout', () => {
  it('stacks Set my Zen step 1 in one column and keeps the wide layout for larger screens', () => {
    expect(zenSnapGridClass).toContain('grid-cols-1');
    expect(zenSnapGridClass).toContain('grid-rows-[minmax(0,1fr)_auto]');
    expect(zenSnapGridClass).toContain('md:grid-cols-[minmax(0,68fr)_minmax(240px,30fr)]');
    expect(zenSnapGridClass).not.toContain('280px');
  });

  it('lets the header wrap and keeps the step pill on one line', () => {
    expect(zenHeaderClass).toContain('flex-wrap');
    expect(zenHeaderClass).toContain('sm:flex-nowrap');
    expect(zenHeaderClass).not.toMatch(/(^|\s)h-16(\s|$)/);
    expect(stepPillClass).toContain('truncate');
    expect(stepPillClass).toContain('whitespace-nowrap');
    const html = renderToString(
      createElement(StepPill, { label: 'Step 1 of 4 · Get ready', short: '1 of 4 · Get ready' }),
    );
    expect(html).toContain('Step 1 of 4 · Get ready');
    expect(html).toContain('1 of 4 · Get ready');
    expect(html).toContain('whitespace-nowrap');
    expect(html).not.toContain('\u2014');
  });

  it('puts coach copy and the action buttons in separate rows on a phone', () => {
    expect(zenDockClass).toContain('flex-col');
    expect(zenDockClass).toContain('md:flex-row');
    const html = renderToString(
      createElement(
        ZenDock,
        {
          tone: 'coach',
          title: "Let's set your Zen",
          helper: "Match the posture picture. When all four are green, I'll take your picture.",
        },
        createElement(DockButton, { onClick: () => undefined }, 'Back'),
        createElement(DockButton, { onClick: () => undefined, primary: true }, 'Take picture'),
      ),
    );
    expect(html).toContain('set your Zen');
    expect(html).toContain('>Back<');
    expect(html).toContain('>Take picture<');
    expect(html).toContain('flex-col');
    expect(html).not.toContain('\u2014');
  });

  it('keeps the posture picture short on a phone', () => {
    const html = renderToString(
      createElement(PostureSidePanel, {
        mode: 'sit',
        active: null,
        reduced: true,
        onMode: () => undefined,
      }),
    );
    expect(html).toContain('max-h-[6.75rem]');
    expect(html).toContain('md:max-h-none');
    expect(html).toContain('Correct posture');
  });

  it('keeps the Live feedback card short and low on a phone', () => {
    const html = renderToString(
      createElement(FeedbackCard, {
        questions: ['source', 'setup'],
        onAnswer: () => undefined,
        onComment: () => undefined,
        onClose: () => undefined,
        place: 'bottom',
      }),
    );
    expect(html).toContain('max-sm:bottom-1');
    expect(html).toContain('max-sm:max-h-[min(8.75rem,28%)]');
    expect(html).toContain('How did you find DeskZen?');
  });
});

describe('fit and hold escape hatch', () => {
  it('offers save anyway only after 15 seconds, without touching the hold score', () => {
    expect(FIT_SAVE_ANYWAY_MS).toBe(15_000);
    expect(fitSaveAnywayReady(14_999)).toBe(false);
    expect(fitSaveAnywayReady(15_000)).toBe(true);
    expect(fitSaveAnywayReady(Number.NaN)).toBe(false);
    expect(zenConfig.fitGood).toBe(90);
    expect(zenConfig.fitHoldMs).toBe(3_000);
  });

  it('opens Live view with a document load so the old screen cannot stay painted', () => {
    const urls: string[] = [];
    openLiveView((url) => urls.push(url));
    expect(urls).toEqual(['/live']);
  });
});
