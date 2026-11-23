import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../camera/camera-context';

/** Top-right pill. HD when the live track is at least 1280x720. Click to switch cameras. */
export function HdCameraPill({ compact = false }: { compact?: boolean }) {
  const { hd, status, devices, deviceId, refreshDevices, selectCamera } = useCamera();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const live = status === 'live';

  useEffect(() => {
    if (!open) return;
    void refreshDevices();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open, refreshDevices]);

  return (
    <div ref={rootRef} className={compact ? 'relative min-w-0 flex-1' : 'relative'}>
      <button
        type="button"
        className={
          compact
            ? 'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-white/15 bg-slate-900/70 px-2 text-xs font-semibold text-white backdrop-blur-md'
            : 'inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-slate-900/70 px-3 text-sm font-medium text-white backdrop-blur-md'
        }
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="HD camera"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`size-2 shrink-0 rounded-full ${live && hd ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
        {compact ? 'HD' : 'HD camera'}
      </button>
      {open ? (
        <ul className={`absolute mt-2 w-56 rounded-2xl bg-white/15 p-1 text-sm text-white shadow-lg backdrop-blur-xl ${compact ? 'left-0 z-30' : 'right-0 z-20'}`} role="menu">
          {devices.length === 0 ? <li className="px-3 py-2 text-white/80">Looking for cameras…</li> : null}
          {devices.map((device) => (
            <li key={device.deviceId || device.label}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={device.deviceId === deviceId}
                className="w-full rounded-xl px-3 py-2 text-left hover:bg-white/15"
                onClick={() => {
                  setOpen(false);
                  void selectCamera(device.deviceId);
                }}
              >
                {device.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
