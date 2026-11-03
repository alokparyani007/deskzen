export type MoveKind = 'shoulders' | 'neck' | 'chin' | 'breath';

/** Line drawing of a seated person. The emerald part is the one that moves. */
export function MoveIcon({ kind, active, reduced, large = false, light = false }: { kind: MoveKind; active: boolean; reduced: boolean; large?: boolean; light?: boolean }) {
  const motion = active && !reduced ? `reset-move-${kind}` : '';
  return (
    <svg viewBox="0 0 64 72" className={`${large ? 'size-[120px]' : 'size-10'} shrink-0 ${light ? 'text-white' : 'text-desk'}`} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 58h32M20 58v8M44 58v8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 46h20l2 12H20z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M24 36c2 6 14 6 16 0" stroke="currentColor" strokeWidth="1.6" />
      <g className={kind === 'shoulders' ? motion : undefined}>
        <path d="M20 34c4-4 20-4 24 0" stroke={kind === 'shoulders' ? 'var(--color-print)' : 'currentColor'} strokeWidth="1.7" />
        <path d="M20 34l-7 9M44 34l7 9" stroke="currentColor" strokeWidth="1.6" />
      </g>
      <g className={kind === 'neck' || kind === 'chin' ? motion : undefined}>
        <circle cx="32" cy="16" r="7" stroke={kind === 'neck' || kind === 'chin' ? 'var(--color-print)' : 'currentColor'} strokeWidth="1.6" />
        <path d="M27 18c2 2 8 2 10 0" stroke={kind === 'chin' ? 'var(--color-print)' : 'currentColor'} strokeWidth="1.6" />
        {kind === 'neck' ? (
          <path d="M44 6c8 2 12 12 6 20M50 6l-5 1 2 5" stroke="var(--color-print)" strokeWidth="1.6" />
        ) : null}
      </g>
      <path d="M32 23v8" stroke="currentColor" strokeWidth="1.6" />
      <g className={kind === 'breath' ? motion : undefined}>
        <path d="M26 38h12" stroke={kind === 'breath' ? 'var(--color-print)' : 'currentColor'} strokeWidth="1.7" />
      </g>
    </svg>
  );
}
