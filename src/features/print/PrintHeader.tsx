import type { ReactNode } from 'react';
import { Logo } from '../../components/Logo';

export function PrintHeader({ step, title, mint = false, aside, accent = false }: { step: string; title: string; mint?: boolean; aside?: ReactNode; accent?: boolean }) {
  const tone = accent ? 'text-print' : '';
  return (
    <header className={`flex items-center gap-3 px-4 py-3 ${mint ? 'bg-brand-tint' : 'bg-white'}`}>
      <Logo />
      <h1 className="min-w-0 flex-1 text-center text-lg font-semibold text-ink sm:text-xl">
        {step ? (
          <>
            <span className={accent ? tone : 'text-ink-muted'}>{step}</span>
            <span className={accent ? tone : 'text-ink'}> · {title}</span>
          </>
        ) : (
          title
        )}
      </h1>
      {aside ?? <span className="hidden w-28 sm:block" aria-hidden="true" />}
    </header>
  );
}
