import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { cameraWasSkipped, isOnboardingDone } from '../lib/storage/local-data';
import { calibrationNeeded } from '../lib/settings/visibility';
import { useBaseline } from '../features/posture/baseline-context';
import { useSession } from '../features/session/session-context';

export function OnboardingGate() {
  const location = useLocation();
  const { baseline, standing, ready } = useBaseline();
  const { settings } = useSession();
  const needed = calibrationNeeded(settings.workStyle, baseline !== null, standing !== null);
  const onboarded = isOnboardingDone();
  const alwaysOpen = location.pathname === '/welcome' || location.pathname === '/app/privacy';

  if (!onboarded && !alwaysOpen && !import.meta.env.DEV) {
    return <Navigate to="/welcome" replace />;
  }

  if (
    onboarded &&
    ready &&
    needed &&
    !cameraWasSkipped() &&
    location.pathname === '/app'
  ) {
    return <Navigate to={`/calibrate?pose=${needed}`} replace />;
  }

  return <Outlet />;
}
