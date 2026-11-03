import type { ReactNode } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

type PlaceholderPageProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function PlaceholderPage({ title, description, children }: PlaceholderPageProps) {
  usePageTitle(title);

  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold text-white">{title}</h1>
      <p className="mt-3 max-w-xl text-white/70">{description}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
