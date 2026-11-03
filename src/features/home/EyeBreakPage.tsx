import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';

const SECONDS = 20;

export function EyeBreakPage() {
  usePageTitle('Eye break');
  const [left, setLeft] = useState(SECONDS);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      const remain = Math.max(0, SECONDS - Math.floor((Date.now() - started) / 1000));
      setLeft(remain);
      if (remain === 0) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="text-3xl font-semibold text-ink">Eye break</h1>
      <p className="mt-2 text-sm text-ink-muted">Look about 20 feet away. This stays on your device.</p>
      <p className="mt-8 text-6xl font-semibold text-print" aria-live="polite">{left}</p>
      <p className="mt-2 text-sm text-ink-muted">{left === 0 ? 'Nice reset.' : 'seconds left'}</p>
      <Link to="/app" className="mt-8 inline-flex rounded-xl bg-print px-4 py-3 text-sm font-semibold text-white">Back home</Link>
    </section>
  );
}
