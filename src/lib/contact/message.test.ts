import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { planContact } from './message';

const good = {
  name: 'Maya Chen',
  email: 'maya@example.com',
  message: 'The afternoon nudge helped me notice I was leaning in.',
  companyUrl: '',
};

describe('contact form plan', () => {
  it('sends a trimmed note and drops the honeypot when it is empty', () => {
    expect(planContact({ ...good, name: '  Maya   Chen  ', message: '  Hello there.  ' })).toEqual({
      ok: true,
      silent: false,
      row: { name: 'Maya Chen', email: 'maya@example.com', message: 'Hello there.' },
    });
  });

  it('pretends to succeed when the honeypot is filled', () => {
    expect(planContact({ ...good, companyUrl: 'https://spam.example' })).toEqual({ ok: true, silent: true });
  });

  it('asks for a name, a real email, and a message', () => {
    expect(planContact({ ...good, name: '   ' })).toEqual({ ok: false, field: 'name' });
    expect(planContact({ ...good, name: 'A'.repeat(81) })).toEqual({ ok: false, field: 'name' });
    expect(planContact({ ...good, email: 'not-an-email' })).toEqual({ ok: false, field: 'email' });
    expect(planContact({ ...good, message: '' })).toEqual({ ok: false, field: 'message' });
    expect(planContact({ ...good, message: 'x'.repeat(4001) })).toEqual({ ok: false, field: 'message' });
  });

  it('keeps the inbox address out of the browser source', () => {
    const send = readFileSync('src/lib/contact/send.ts', 'utf8');
    const form = readFileSync('src/features/site/ContactForm.tsx', 'utf8');
    for (const file of [send, form]) {
      expect(file.toLowerCase()).not.toContain('sales@');
      expect(file).not.toContain('service_role');
    }
  });
});
