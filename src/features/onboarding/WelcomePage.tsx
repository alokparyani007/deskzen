import { useState } from 'react';
import { SETUP_TIME } from '../../lib/copy/setupTime';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { usePageTitle } from '../../hooks/usePageTitle';
import { applyWorkStyle, calibrationNeeded } from '../../lib/settings/visibility';
import { markOnboardingDone } from '../../lib/storage/local-data';
import { CameraDenied } from '../camera/CameraDenied';
import { useCamera } from '../camera/camera-context';
import { useSession } from '../session/session-context';
import { WorkStylePicker } from '../settings/WorkStylePicker';

const STEPS = [
  {
    title: 'Set my Zen',
    body: `This is your posture baseline. Sit back, feet flat, screen at eye level. It takes ${SETUP_TIME} and stays on this device.`,
  },
  {
    title: 'How do you work?',
    body: 'DeskZen will match breaks and setup to your desk. You can change this later.',
  },
  {
    title: 'Your camera stays here',
    body: 'Video is processed in this browser. Nothing is recorded or uploaded. DeskZen only saves numbers, like your baseline. DeskZen is a wellness tool, not a medical device.',
  },
  {
    title: 'Turn on the camera when you are ready',
    body: 'You can also skip this and use break reminders. We will not ask for the camera until you choose it.',
  },
];

const GLOW_TIPS = ['Sit back', 'Feet flat', 'Screen at eye level'];

export function WelcomePage() {
  usePageTitle('Welcome');
  const navigate = useNavigate();
  const { start, status, errorName } = useCamera();
  const { settings, updateSettings } = useSession();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;

  function skip() {
    markOnboardingDone(true);
    navigate('/reminders');
  }

  async function turnOnCamera() {
    const ok = await start();
    if (!ok) return;
    markOnboardingDone(false);
    const pose = calibrationNeeded(settings.workStyle, false, false) ?? 'sit';
    navigate(`/calibrate?pose=${pose}`);
  }

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-5 py-10">
      <Logo />
      <p className="mt-8 text-sm font-medium text-brand">Step {step + 1} of {STEPS.length}</p>
      <h1 className="mt-2 text-3xl font-semibold text-ink">{current.title}</h1>
      <p className="mt-3 text-ink-muted">{current.body}</p>
      {step === 0 ? (
        <div className="mt-6">
          <video
            className="aspect-video w-full rounded-2xl bg-surface object-cover"
            src="/media/videos/posture-reset.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="A short posture reset"
          />
          <ul className="mt-3 grid gap-2">
            {GLOW_TIPS.map((tip) => (
              <li key={tip} className="rounded-2xl bg-surface px-3 py-2 text-sm font-semibold text-ink">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {step === 1 ? (
        <div className="mt-6">
          <WorkStylePicker value={settings.workStyle} onChange={(style) => updateSettings(applyWorkStyle(settings, style))} />
        </div>
      ) : null}
      {status === 'denied' || status === 'unavailable' ? (
        <div className="mt-6">
          <CameraDenied errorName={errorName} onRetry={() => void turnOnCamera()} onSkip={skip} />
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-3">
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setStep((value) => value + 1)}
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => void turnOnCamera()}
              disabled={status === 'requesting'}
            >
              {status === 'requesting' ? 'Waiting for permission…' : 'Turn on camera'}
            </button>
          )}
          <button type="button" className="rounded-xl px-4 py-2.5 text-sm font-medium text-ink-muted" onClick={skip}>
            Continue without camera
          </button>
        </div>
      )}
    </section>
  );
}
