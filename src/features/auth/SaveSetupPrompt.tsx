import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthSession } from '../../lib/auth';
import { dismissGuestSetupPrompt, guestSetupPromptPending } from './guestPrompt';

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-outline';

/** A quiet, optional sign-in after a guest saves their first Zen. Data stays on the device. */
export function SaveSetupPrompt() {
  const session = useAuthSession();
  const [pending, setPending] = useState(() => (typeof window === 'undefined' ? false : guestSetupPromptPending()));

  if (session || !pending) return null;

  return (
    <div className="mx-4 mb-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-[#13261e] px-4 py-3" role="status">
      <p className="max-w-xl text-sm text-white/85">
        <span className="font-semibold text-white">Save your setup. </span>
        Sign in is optional. Your Zen stays on this device.
      </p>
      <div className="flex items-center gap-2">
        <Link to="/login?from=/live" className={`inline-flex min-h-11 items-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-callout ${focus}`}>
          Sign in
        </Link>
        <button
          type="button"
          className={`inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 ${focus}`}
          onClick={() => {
            dismissGuestSetupPrompt();
            setPending(false);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
