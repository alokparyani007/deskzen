import { Outlet } from 'react-router-dom';

/**
 * Every signed-in person lands on the dark Home dashboard. Without a Posture Print, Home,
 * the sidebar and the camera card point to Set my Zen (/set-my-zen) instead of redirecting.
 */
export function OnboardingGate() {
  return <Outlet />;
}
