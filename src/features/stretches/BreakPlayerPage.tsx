import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useSession } from '../session/session-context';
import { routines, stretchesIn } from './data';
import { StretchPhoto } from './StretchPhoto';

const routine = routines[0]!;
const steps = stretchesIn(routine);

export function BreakPlayerPage() {
  usePageTitle('Stretch break');
  const navigate = useNavigate();
  const { startBreak, finishBreak, cancelBreak } = useSession();
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(steps[0]?.durationSeconds ?? 30);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const finished = useRef(false);
  const indexRef = useRef(0);
  const leftRef = useRef(steps[0]?.durationSeconds ?? 30);
  const current = steps[index];

  useEffect(() => {
    startBreak();
    return () => {
      if (!finished.current) cancelBreak();
    };
  }, [startBreak, cancelBreak]);

  useEffect(() => {
    if (paused || done) return;
    const id = window.setInterval(() => {
      leftRef.current -= 1;
      if (leftRef.current <= 0) {
        if (indexRef.current >= steps.length - 1) {
          setDone(true);
          return;
        }
        indexRef.current += 1;
        leftRef.current = steps[indexRef.current]?.durationSeconds ?? 0;
        setIndex(indexRef.current);
      }
      setLeft(leftRef.current);
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused, done]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col px-4 py-6">
      <h1 className="text-3xl font-semibold text-white">{routine.name}</h1>
      {done ? (
        <div className="mt-8 rounded-3xl bg-white/5 px-6 py-10 text-center shadow-[0_0_40px_var(--color-glow)]">
          <p className="text-2xl font-semibold text-white">Nice reset.</p>
          <p className="mt-2 text-sm text-white/70">That may help you feel looser. This counts as a break.</p>
          <button
            type="button"
            className="mt-6 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => {
              finished.current = true;
              finishBreak();
              navigate('/app');
            }}
          >
            Done
          </button>
        </div>
      ) : (
        <>
          {current ? (
            <div className="mt-4">
              <StretchPhoto stretch={current} />
            </div>
          ) : null}
          <h2 className="mt-4 text-xl font-semibold text-white">{current?.name}</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/70">
            {current?.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-6 text-6xl font-semibold tabular-nums text-outline" aria-live="polite">
            {Math.max(left, 0)}
          </p>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
              onClick={() => {
                indexRef.current = Math.max(0, indexRef.current - 1);
                leftRef.current = steps[indexRef.current]?.durationSeconds ?? 0;
                setIndex(indexRef.current);
                setLeft(leftRef.current);
              }}
            >
              Previous
            </button>
            <button type="button" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={() => setPaused((value) => !value)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold"
              onClick={() => {
                if (indexRef.current >= steps.length - 1) setDone(true);
                else {
                  indexRef.current += 1;
                  leftRef.current = steps[indexRef.current]?.durationSeconds ?? 0;
                  setIndex(indexRef.current);
                  setLeft(leftRef.current);
                }
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
      <Link className="mt-6 text-sm font-semibold text-outline" to="/stretches">
        Browse the library
      </Link>
    </section>
  );
}
