import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthReady, useAuthSession } from '../lib/auth';

/**
 * Keeps the app pages for signed-in people. Signed-out visitors go to /login.
 * The homepage, /login, /privacy and /terms sit outside this gate.
 */
export function AuthGate() {
  const ready = useAuthReady();
  const session = useAuthSession();
  const location = useLocation();

  // Wait for the saved session (or a magic-link return) before deciding.
  if (!ready) return <div className="min-h-dvh bg-[#060807]" aria-busy="true" aria-label="Loading" />;
  if (!session) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}
