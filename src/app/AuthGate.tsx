import { useLayoutEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { documentHasPublicAnalytics, shouldReloadToAppDocument } from '../features/site/enterApp';
import { useAuthReady, useAuthSession } from '../lib/auth';

/**
 * Keeps the app pages for signed-in people. Signed-out visitors go to /login.
 * The homepage, /login, /privacy and /terms sit outside this gate.
 *
 * If someone arrives from a public page by client-side navigation, this document
 * still has the Google Analytics snippet. Reload so the server sends app.html.
 */
export function AuthGate() {
  const ready = useAuthReady();
  const session = useAuthSession();
  const location = useLocation();
  const href = `${location.pathname}${location.search}${location.hash}`;
  const needsAppDocument = Boolean(ready && session && shouldReloadToAppDocument(href, documentHasPublicAnalytics()));

  useLayoutEffect(() => {
    if (needsAppDocument) window.location.replace(href);
  }, [needsAppDocument, href]);

  // Wait for the saved session (or a magic-link return) before deciding.
  if (!ready || needsAppDocument) return <div className="min-h-dvh bg-[#060807]" aria-busy="true" aria-label="Loading" />;
  if (!session) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}
