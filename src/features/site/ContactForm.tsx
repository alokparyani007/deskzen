import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { planContact } from '../../lib/contact/message';
import { sendContact } from '../../lib/contact/send';
import { ctaClass, siteFocus } from './SiteChrome';
import { CONTACT_HEADING, CONTACT_PARAGRAPHS, CONTACT_SIGN } from './founderCopy';

const fieldClass = `mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 ${siteFocus}`;

type Status = 'idle' | 'sending' | 'sent' | 'rate_limited' | 'failed';

export function ContactSuccess() {
  return (
    <div role="status" className="rounded-3xl border border-outline/40 bg-print/[0.08] px-6 py-8 text-center">
      <Mail className="mx-auto size-8 text-outline" aria-hidden="true" />
      <p className="mt-4 text-xl font-semibold text-white">Thanks. Your note is in.</p>
      <p className="mt-2 text-white/75">Alok reads every message.</p>
    </div>
  );
}

export function ContactSection({
  heading = 'h2',
  className = 'mt-14',
  id,
}: {
  heading?: 'h1' | 'h2';
  className?: string;
  id?: string;
}) {
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const trapId = useId();
  const errorId = useId();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [fieldError, setFieldError] = useState<'name' | 'email' | 'message' | null>(null);
  const Title = heading;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plan = planContact({ name, email, message, companyUrl });
    if (!plan.ok) {
      setFieldError(plan.field);
      setStatus('idle');
      return;
    }
    setFieldError(null);
    if (plan.silent) {
      setStatus('sent');
      return;
    }
    setStatus('sending');
    const result = await sendContact(plan.row);
    setStatus(result === 'sent' ? 'sent' : result);
  }

  const error =
    fieldError === 'name'
      ? 'Please add your name.'
      : fieldError === 'email'
        ? 'Please add an email address so Alok can write back.'
        : fieldError === 'message'
          ? 'Please add a short message.'
          : status === 'rate_limited'
            ? 'Please wait a little while before sending another note.'
            : status === 'failed'
              ? 'That note did not go through. Please try again in a moment.'
              : null;

  return (
    <section id={id} aria-labelledby="contact-title" className={`${className} scroll-mt-6`}>
      <div className="flex items-center gap-3">
        <Mail className="size-7 shrink-0 text-outline" aria-hidden="true" />
        <Title id="contact-title" className="text-3xl font-bold tracking-tight text-white">
          {CONTACT_HEADING}
        </Title>
      </div>
      <div className="mt-4 space-y-4 text-base leading-7 text-white/80">
        {CONTACT_PARAGRAPHS.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      <div className="mt-6">
        {status === 'sent' ? (
          <ContactSuccess />
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor={trapId}>Company website</label>
              <input
                id={trapId}
                name="company_url"
                tabIndex={-1}
                autoComplete="off"
                value={companyUrl}
                onChange={(event) => setCompanyUrl(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor={nameId} className="text-sm font-semibold text-white">
                Name
              </label>
              <input
                id={nameId}
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={emailId} className="text-sm font-semibold text-white">
                Email
              </label>
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={messageId} className="text-sm font-semibold text-white">
                Message
              </label>
              <textarea
                id={messageId}
                name="message"
                required
                rows={5}
                maxLength={4000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className={fieldClass}
              />
            </div>
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-amber-200">
                {error}
              </p>
            ) : null}
            <button type="submit" className={ctaClass} disabled={status === 'sending'} aria-describedby={error ? errorId : undefined}>
              <Mail className="mr-2 size-5" aria-hidden="true" />
              {status === 'sending' ? 'Sending' : 'Send'}
            </button>
          </form>
        )}
      </div>
      <p className="mt-6 font-semibold text-white">{CONTACT_SIGN}</p>
    </section>
  );
}
