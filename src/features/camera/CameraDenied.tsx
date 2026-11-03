interface CameraDeniedProps {
  errorName: string | null;
  onRetry: () => void;
  onSkip?: () => void;
}

export function CameraDenied({ errorName, onRetry, onSkip }: CameraDeniedProps) {
  const help = helpFor(errorName);
  return (
    <section className="rounded-2xl border border-ink/10 bg-surface p-5">
      <h2 className="text-xl font-semibold text-ink">{help.title}</h2>
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-ink-muted">
        {help.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white"
          onClick={onRetry}
        >
          Try again
        </button>
        {onSkip ? (
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-ink-muted"
            onClick={onSkip}
          >
            Continue without camera
          </button>
        ) : null}
      </div>
    </section>
  );
}

function helpFor(errorName: string | null): { title: string; steps: string[] } {
  if (errorName === 'NotFoundError' || errorName === 'OverconstrainedError') {
    return {
      title: "We can't find a camera",
      steps: [
        'Use a laptop with a webcam, or plug one in.',
        'Close other apps that might be using it.',
        'Then try again.',
      ],
    };
  }
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) {
    return {
      title: 'Edge blocked the camera',
      steps: [
        'Select the lock icon in the address bar.',
        'Open site permissions for this page.',
        'Set Camera to Allow.',
        'Then try again.',
      ],
    };
  }
  if (/Firefox\//.test(ua)) {
    return {
      title: 'Firefox blocked the camera',
      steps: [
        'Select the lock icon in the address bar.',
        'Clear the blocked camera permission.',
        'Try again and choose Allow.',
      ],
    };
  }
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    return {
      title: 'Safari blocked the camera',
      steps: [
        'Open Safari Settings, then Websites, then Camera.',
        'Allow this site.',
        'Reload the page and try again.',
      ],
    };
  }
  return {
    title: 'The camera is blocked',
    steps: [
      'Select the lock icon in the address bar.',
      'Set Camera to Allow for this site.',
      'Then try again. Video still stays on this device.',
    ],
  };
}
