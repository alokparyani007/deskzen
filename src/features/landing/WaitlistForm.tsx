import { useState, type FormEvent } from 'react';

type WaitlistFormProps = {
  id?: string;
};

export function WaitlistForm({ id }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter an email like you@example.com.');
      setDone(false);
      return;
    }
    setError(null);
    // TODO: connect waitlist backend
    setDone(true);
  }

  if (done) {
    return <p role="status" className="text-sm font-semibold text-brand">You&apos;re on the list! We&apos;ll email you when DeskZen is ready.</p>;
  }

  return (
    <form id={id} className="flex w-full max-w-md flex-col gap-2 sm:flex-row" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={`${id ?? 'waitlist'}-email`}>
        Email
      </label>
      <input
        id={`${id ?? 'waitlist'}-email`}
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded-xl border border-ink/15 px-3 py-2.5 text-sm"
        onChange={(event) => setEmail(event.target.value)}
      />
      <button type="submit" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">
        Join the waitlist
      </button>
      {error ? <p className="text-sm text-alert sm:basis-full">{error}</p> : null}
    </form>
  );
}
