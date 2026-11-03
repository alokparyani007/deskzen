import { Armchair, PersonStanding } from 'lucide-react';

export function PosturePill({ posture, className = '' }: { posture: 'sitting' | 'standing'; className?: string }) {
  const standing = posture === 'standing';
  const Icon = standing ? PersonStanding : Armchair;
  return (
    <p
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-ink shadow-sm transition-colors duration-500 ${className}`}
    >
      <Icon className={`size-4 ${standing ? 'text-sky-brand' : 'text-brand'}`} aria-hidden="true" />
      {standing ? 'Standing' : 'Sitting'}
    </p>
  );
}
