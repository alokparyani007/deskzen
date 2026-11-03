import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { stretchCategories, stretches, type StretchCategory } from './data';
import { StretchPhoto } from './StretchPhoto';

export function StretchLibraryPage() {
  usePageTitle('Stretches');
  const [category, setCategory] = useState<StretchCategory | 'All'>('All');
  const visible = stretches.filter((item) => category === 'All' || item.category === category);

  return (
    <section className="px-4 py-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-white">Stretch library</h1>
      <p className="mt-2 max-w-xl text-sm text-white/70">Short desk moves that may help you feel looser. DeskZen is a wellness tool, not a medical device.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categories">
        {(['All', ...stretchCategories] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${category === item ? 'bg-brand text-white' : 'bg-white/10 text-white'}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Link to={`/stretches/${item.id}`} className="block rounded-2xl border border-white/10 bg-white/5 p-3">
              <StretchPhoto stretch={item} />
              <h2 className="mt-3 font-semibold text-white">{item.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-print/20 px-2.5 py-1 text-xs font-semibold text-outline">{item.category}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">{item.durationSeconds} sec</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link className="mt-4 inline-block text-sm font-semibold text-outline" to="/break">
        Start a 2 minute reset
      </Link>
    </section>
  );
}
