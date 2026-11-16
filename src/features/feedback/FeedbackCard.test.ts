import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FeedbackCard } from './FeedbackCard';

function render(sent = false): string {
  return renderToString(
    createElement(FeedbackCard, {
      onDismiss: () => {},
      onSubmit: () => Promise.resolve(true),
      initialSent: sent,
    }),
  );
}

describe('feedback card', () => {
  it('asks how DeskZen was, with thumbs, an optional note, Send, and No thanks', () => {
    const html = render();
    expect(html).toContain('How was DeskZen?');
    expect(html).toContain('aria-label="Thumbs up"');
    expect(html).toContain('aria-label="Thumbs down"');
    expect(html).toContain('What should we improve?');
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain('>Send<');
    expect(html).toContain('No thanks');
    expect(html).toContain('No name or email.');
    expect(html).not.toContain('Thanks, this really helps.');
    expect(html).not.toContain('\u2014');
    expect(html.toLowerCase()).not.toMatch(/\b(cure|diagnose|treat|injury)\b/);
  });

  it('thanks the person after a send', () => {
    const html = render(true);
    expect(html).toContain('Thanks, this really helps.');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('>Close<');
    expect(html).not.toContain('What should we improve?');
  });
});
