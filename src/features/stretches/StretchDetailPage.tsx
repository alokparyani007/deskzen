import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { stretchById } from './data';
import { StretchPhoto } from './StretchPhoto';

export function StretchDetailPage() {
  const { id = '' } = useParams();
  const stretch = stretchById(id);
  usePageTitle(stretch?.name ?? 'Stretch');
  const [seen, setSeen] = useState(id);
  const [left, setLeft] = useState(stretch?.durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const leftRef = useRef(stretch?.durationSeconds ?? 0);
  if (seen !== id) {
    setSeen(id);
    setLeft(stretch?.durationSeconds ?? 0);
    setPaused(false);
    setDone(false);
  }

  useEffect(() => {
    leftRef.current = stretch?.durationSeconds ?? 0;
  }, [id, stretch]);

  useEffect(() => {
    if (!stretch || paused || done) return;
    const timer = window.setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current <= 0) {
        setLeft(0);
        setDone(true);
        return;
      }
      setLeft(leftRef.current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [stretch, paused, done, id]);

  if (!stretch) {
    return (
      <section className="px-4 py-6">
        <h1 className="text-2xl font-semibold text-ink">That stretch is not in the library.</h1>
        <Link className="mt-4 inline-block text-sm font-semibold text-brand" to="/stretches">
          Back to stretches
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-6">
      <Link className="text-sm font-semibold text-brand" to="/stretches">
        All stretches
      </Link>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{stretch.name}</h1>
      <div className="mt-3 flex gap-2">
        <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand">{stretch.category}</span>
        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">{stretch.durationSeconds} sec</span>
      </div>
      <div className="mt-4">
        <StretchPhoto stretch={stretch} />
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink-muted">
        {stretch.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-sm text-ink-muted">{stretch.note}</p>
      <p className="mt-6 text-6xl font-semibold tabular-nums text-brand" aria-live="polite">
        {Math.max(left, 0)}
      </p>
      {done ? (
        <p className="mt-4 text-sm font-semibold text-ink">Nice. That may help you feel looser.</p>
      ) : (
        <button type="button" className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setPaused((value) => !value)}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      )}
      <p className="mt-6 text-xs text-ink-muted">DeskZen is a wellness tool, not a medical device.</p>
    </section>
  );
}
