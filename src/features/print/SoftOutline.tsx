/** Fixed head-and-shoulders target. Shoulder span is about 0.45 of the frame. */
export function SoftOutline({ tone, dash = true }: { tone: 'emerald' | 'amber'; dash?: boolean }) {
  const color = tone === 'amber' ? 'text-glow' : 'text-print';
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${color}`} viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
      <path
        d="M50 8 C43 8 37.5 13 37.5 20 C37.5 27 42.5 32 47 33.5 C38 35 27.5 40 27.5 48 C27.5 56 30.5 63 36 67 C41 69.5 46 70.5 50 70.5 C54 70.5 59 69.5 64 67 C69.5 63 72.5 56 72.5 48 C72.5 40 62 35 53 33.5 C57.5 32 62.5 27 62.5 20 C62.5 13 57 8 50 8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dash ? '0.15 1.7' : '0'}
      />
    </svg>
  );
}
