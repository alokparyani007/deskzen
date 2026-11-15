import { ZEN_SETUP_INTRO } from '../../lib/copy/setupTime';
import { printButton } from './printButton';

export function PrivacyCard({
  status,
  errorName,
  onStart,
  onLeave,
  tone = 'dark',
  title = 'Set my Zen',
  intro = ZEN_SETUP_INTRO,
}: {
  status: string;
  errorName: string | null;
  onStart: () => void;
  onLeave: () => void;
  /** Dark for Set my Zen v2 and Live view. The older light flow passes light. */
  tone?: 'dark' | 'light';
  /** Visible page title. Live view passes its own so this card is not mistaken for Set my Zen. */
  title?: string;
  intro?: string;
}) {
  const titleClass = tone === 'dark' ? 'text-white' : 'text-ink';
  const muted = tone === 'dark' ? 'text-white/70' : 'text-ink-muted';
  const denied = status === 'denied' || status === 'unavailable';
  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className={`text-2xl font-semibold ${titleClass}`}>{title}</h1>
      <p className={`mt-3 max-w-xl text-base ${muted}`}>{intro}</p>
      {denied ? (
        <p className={`mt-4 text-sm ${muted}`} role="status">
          {cameraMessage(errorName)}
        </p>
      ) : null}
      <button type="button" className={`mt-6 ${printButton}`} onClick={onStart}>
        {denied ? 'Try again' : 'Turn on camera'}
      </button>
      <button type="button" className={`mt-3 block text-sm font-semibold ${muted}`} onClick={onLeave}>
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
