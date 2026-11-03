import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlaceholderPage } from '../../components/PlaceholderPage';
import { deleteAllLocalData } from '../../lib/storage/local-data';
import { useBaseline } from '../posture/baseline-context';

export function PrivacyPage() {
  const navigate = useNavigate();
  const { clear } = useBaseline();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function clearLocalData(): Promise<void> {
    await clear();
    await deleteAllLocalData();
    setConfirming(false);
    navigate('/app');
  }

  return (
    <PlaceholderPage
      title="Privacy"
      description="Your camera never leaves your device. No video is saved or uploaded. Ever."
    >
      <ul className="list-disc space-y-2 pl-5 text-sm text-white/85">
        <li>Pose checks run in this browser only.</li>
        <li>Only small numbers, like your baseline and settings, are stored on this device.</li>
        <li>You can pause the camera or delete what DeskZen saved at any time.</li>
      </ul>
      <p className="mt-4 text-sm text-white/55">DeskZen is a wellness tool, not a medical device.</p>
      <div className="mt-6">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-white">Clear everything saved in this browser?</p>
            <button
              type="button"
              className="rounded-xl bg-print px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void clearLocalData()}
            >
              Delete all my data
            </button>
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-medium text-white/70"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => {
              setStatus(null);
              setConfirming(true);
            }}
          >
            Delete all my data
          </button>
        )}
        {status ? (
          <p className="mt-3 text-sm text-outline" role="status">
            {status}
          </p>
        ) : null}
      </div>
    </PlaceholderPage>
  );
}
