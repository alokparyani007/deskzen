import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { cameraWasSkipped } from '../lib/storage/local-data';
import { calibrationNeeded } from '../lib/settings/visibility';
import { useBaseline } from '../features/posture/baseline-context';
import { useSession } from '../features/session/session-context';

export function OnboardingGate() {
  const location = useLocation();
  const { baseline, standing, ready } = useBaseline();
  const { settings } = useSession();
  const needed = calibrationNeeded(settings.workStyle, baseline !== null, standing !== null);

  if (
    ready &&
    needed &&
    !cameraWasSkipped() &&
    location.pathname === '/app'
  ) {
    return <Navigate to={`/set-my-zen?pose=${needed}`} replace />;
  }

  return <Outlet />;
}
