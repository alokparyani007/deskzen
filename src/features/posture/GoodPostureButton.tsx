import { Link } from 'react-router-dom';
import { useSession } from '../session/session-context';

export function GoodPostureButton({ className = '' }: { className?: string }) {
  const { cameraLive, goodPosture, captureGoodPosture } = useSession();
  const label = goodPosture === 'capturing' ? 'Hold still for 3 seconds' : goodPosture === 'saved' ? 'Saved as your Glow' : "That's my good posture";
  if (!cameraLive) {
    return (
      <Link to="/live?good=1" className={`inline-flex rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink ${className}`}>
        That&apos;s my good posture
      </Link>
    );
  }
  return (
    <button type="button" className={`rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink ${className}`} onClick={captureGoodPosture}>
      {label}
    </button>
  );
}
