import { useEffect, useRef, useState } from 'react';
import { useCamera } from '../camera/camera-context';

/** Top-right pill. HD when the live track is at least 1280x720. Click to switch cameras. */
export function HdCameraPill() {
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
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-slate-900/70 px-2.5 text-sm font-medium text-white backdrop-blur-md sm:px-3"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="HD camera"
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`size-2 rounded-full ${live && hd ? 'bg-outline' : 'bg-white/40'}`} aria-hidden="true" />
        <span className="sm:hidden">HD</span>
        <span className="hidden sm:inline">HD camera</span>
      </button>
      {open ? (
        <ul className="absolute right-0 z-20 mt-2 w-56 rounded-2xl bg-white/15 p-1 text-sm text-white shadow-lg backdrop-blur-xl" role="menu">
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
