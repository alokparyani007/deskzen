import { useEffect, useState } from 'react';

export const GUIDE_SRC = '/media/guides/good-desk-posture.jpg';
export const GUIDE_ALT = 'Good desk posture guide for sitting and standing.';

export function guideOpen(open: boolean, action: 'open' | 'close'): boolean {
  if (action === 'close') return false;
  return open || action === 'open';
}

export function PostureGuideCard({ compact = false, posture = 'sitting', variant = 'card' }: { compact?: boolean; posture?: 'sitting' | 'standing'; variant?: 'card' | 'link' }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      {variant === 'link' ? (
        <button type="button" className="text-sm font-semibold text-print" onClick={() => setOpen(true)}>
          Posture guide
        </button>
      ) : (
        <article className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 shadow-sm">
          <button type="button" className="shrink-0" onClick={() => setOpen(true)} aria-label="View guide">
            <img src={GUIDE_SRC} alt={GUIDE_ALT} className="h-16 w-24 rounded-xl bg-brand-tint object-contain" />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Good desk posture</h2>
            <p className="mt-1 text-sm text-ink-muted">{compact ? "Here's what we'll help you find" : 'See what good posture looks like, sitting and standing'}</p>
            <button type="button" className="mt-2 text-sm font-semibold text-print" onClick={() => setOpen(true)}>
              View guide
            </button>
          </div>
        </article>
      )}
      {open ? <GuideLightbox posture={posture} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function GuideLightbox({ posture, onClose }: { posture: 'sitting' | 'standing'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-label="Good desk posture">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-4 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <p className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand">{posture === 'standing' ? 'Standing' : 'Sitting'}</p>
          <button type="button" className="rounded-full px-3 py-1 text-sm font-semibold text-ink" onClick={onClose} aria-label="Close guide">
            X
          </button>
        </div>
        <img src={GUIDE_SRC} alt={GUIDE_ALT} className="mt-3 w-full rounded-xl object-contain" />
      </div>
    </div>
  );
}
