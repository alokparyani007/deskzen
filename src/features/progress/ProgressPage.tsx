import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import type { PeriodId } from '../../lib/progress/period';
import { useSession } from '../session/session-context';
import { ProgressView } from './ProgressView';

const DETAILS_KEY = 'sitglow.progressDetailsOpen';

export function ProgressPage() {
  usePageTitle('Your progress');
  const { minutes, dayCounts, timeZone, settings } = useSession();
  const [period, setPeriod] = useState<PeriodId>('week');
  const [now] = useState(() => Date.now());
  const [details, setDetails] = useState(() => readDetails());

  function toggleDetails() {
    const next = !details;
    setDetails(next);
    try {
      window.localStorage.setItem(DETAILS_KEY, next ? '1' : '0');
    } catch {
      // Private mode: keep it in memory only.
    }
  }

  return (
    <ProgressView
      minutes={minutes}
      dayCounts={dayCounts}
      timeZone={timeZone}
      nowMs={now}
      name={settings.name}
      period={period}
      onPeriod={setPeriod}
      details={details}
      onToggleDetails={toggleDetails}
    />
  );
}

/** Details start collapsed. Once opened, they stay open on later visits. */
function readDetails(): boolean {
  try {
    return window.localStorage.getItem(DETAILS_KEY) === '1';
  } catch {
    return false;
  }
}
