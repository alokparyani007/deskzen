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
      <h1 className="text-3xl font-semibold text-ink">Stretch library</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">Short desk moves that may help you feel looser. DeskZen is a wellness tool, not a medical device.</p>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categories">
        {(['All', ...stretchCategories] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={category === item}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${category === item ? 'bg-brand text-white' : 'bg-surface text-ink'}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <li key={item.id}>
            <Link to={`/stretches/${item.id}`} className="block rounded-2xl border border-ink/10 bg-white p-3 shadow-sm">
              <StretchPhoto stretch={item} />
              <h2 className="mt-3 font-semibold text-ink">{item.name}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand">{item.category}</span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink">{item.durationSeconds} sec</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <Link className="mt-4 inline-block text-sm font-semibold text-brand" to="/break">
        Start a 2 minute reset
      </Link>
    </section>
  );
}
