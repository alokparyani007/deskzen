import { PersonStanding } from 'lucide-react';
import type { Stretch } from './data';

export function StretchPhoto({ stretch, className = '' }: { stretch: Stretch; className?: string }) {
  if (stretch.image) {
    return (
      <img
        src={stretch.image}
        alt={stretch.name}
        loading="lazy"
        className={`aspect-[4/3] w-full rounded-2xl object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-brand-tint to-brand-light/25 ${className}`}>
      <PersonStanding className="size-10 text-brand" aria-hidden="true" />
    </div>
  );
}
