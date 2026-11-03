import { printButton } from './printButton';

export function PrivacyCard({
  status,
  errorName,
  onStart,
  onLeave,
}: {
  status: string;
  errorName: string | null;
  onStart: () => void;
  onLeave: () => void;
}) {
  const denied = status === 'denied' || status === 'unavailable';
  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-ink">Set my Zen</h1>
      <p className="mt-2 max-w-xl text-sm text-ink-muted">About 20 seconds. We'll learn your best posture and save your Posture Print.</p>
      <p className="mt-3 text-base text-ink-muted">
        DeskZen learns your good posture in about a minute. Your camera stays on this device. No video is saved or sent.
      </p>
      {denied ? (
        <p className="mt-4 text-sm text-ink-muted" role="status">
          {cameraMessage(errorName)}
        </p>
      ) : null}
      <button type="button" className={`mt-6 ${printButton}`} onClick={onStart}>
        {denied ? 'Try again' : 'Turn on camera'}
      </button>
      <button type="button" className="mt-3 block text-sm font-semibold text-ink-muted" onClick={onLeave}>
        Not now
      </button>
    </section>
  );
}

function cameraMessage(errorName: string | null): string {
  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return 'The camera permission is off. Allow it in the browser, then try again.';
  }
  if (errorName === 'NotReadableError' || errorName === 'AbortError' || errorName === 'TrackStartError') {
    return 'The camera is already in use. Close the other DeskZen tab or app that has it, then try again.';
  }
  return 'The camera did not start. Check that it is connected and not in use, then try again.';
}
