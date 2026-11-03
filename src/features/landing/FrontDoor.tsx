import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isOnboardingDone } from '../../lib/storage/local-data';
import { LandingPage } from './LandingPage';

export function FrontDoor() {
  useEffect(() => {
    document.title = 'DeskZen: Sit better. Feel brighter.';
  }, []);
  if (isOnboardingDone()) return <Navigate to="/app" replace />;
  return <LandingPage />;
}
