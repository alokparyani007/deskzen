import { Lock } from 'lucide-react';

export function DeviceLock() {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
      <Lock className="size-3.5" aria-hidden="true" />
      Stays on your device
    </p>
  );
}
