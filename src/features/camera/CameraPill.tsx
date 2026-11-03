import { Link } from 'react-router-dom';
import { useCamera } from './camera-context';

export function CameraPill() {
  const { status, pause, start } = useCamera();
  if (status !== 'live' && status !== 'paused' && status !== 'requesting') return null;
  const live = status === 'live';

  return (
    <div className="fixed right-4 top-4 z-30 flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-sm shadow-md">
      <span className={`size-2.5 rounded-full ${live ? 'bg-brand-light' : 'bg-ink-muted'}`} aria-hidden="true" />
      <span className="font-medium text-ink">{live ? 'Camera on' : status === 'requesting' ? 'Starting camera' : 'Camera paused'}</span>
      {live ? (
        <button type="button" className="font-semibold text-brand" onClick={pause}>
          Pause
        </button>
      ) : status === 'paused' ? (
        <button type="button" className="font-semibold text-brand" onClick={() => void start()}>
          Resume
        </button>
      ) : null}
      <Link className="text-ink-muted underline-offset-2 hover:underline" to="/privacy">
        Privacy
      </Link>
    </div>
  );
}
