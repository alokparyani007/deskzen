import { DeviceLock } from '../../components/DeviceLock';
import { CameraDenied } from '../camera/CameraDenied';

const TIPS = ['Sit back', 'Feet flat', 'Screen at eye level'];

export function GlowIntro({
  status,
  errorName,
  onStart,
  tips = TIPS,
}: {
  status: string;
  errorName: string | null;
  onStart: () => void;
  tips?: string[];
}) {
  const denied = status === 'denied' || status === 'unavailable';
  return (
    <div className="mt-4 max-w-xl">
      <video
        className="aspect-video w-full rounded-2xl bg-surface object-cover"
        src="/media/videos/posture-reset.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-label="A short posture reset"
      />
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {tips.map((tip) => (
          <li key={tip} className="rounded-2xl bg-surface px-3 py-3 text-sm font-semibold text-ink">
            {tip}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <DeviceLock />
      </div>
      {denied ? (
        <div className="mt-4">
          <CameraDenied errorName={errorName} onRetry={onStart} />
        </div>
      ) : (
        <button
          type="button"
          className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          onClick={onStart}
          disabled={status === 'requesting'}
        >
          {status === 'requesting' ? 'Turning the camera on…' : 'Turn on camera'}
        </button>
      )}
    </div>
  );
}
