import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { documentHasPublicAnalytics, shouldReloadToAppDocument } from '../features/site/enterApp';
import { clearReturnPath, peekReturnPath } from '../lib/auth/returnPath';
import { useAuthReady, useAuthSession } from '../lib/auth';

/**
 * App routes work for guests and signed-in people. This gate does not ask for an account.
 * If an app route is still inside a public page (which has Google Analytics), reload so
 * the server sends app.html without Google Analytics.
 */
export function AppDocumentGate() {
  const location = useLocation();
  const href = `${location.pathname}${location.search}${location.hash}`;
  const needsAppDocument = shouldReloadToAppDocument(href, documentHasPublicAnalytics());

  useLayoutEffect(() => {
    if (needsAppDocument) window.location.replace(href);
  }, [needsAppDocument, href]);

  if (needsAppDocument) return <div className="min-h-dvh bg-stage" aria-busy="true" aria-label="Loading" />;
  return (
    <>
      <ReturnAfterSignIn />
      <Outlet />
    </>
  );
}

/** After an email link, continue to the page they were headed to. */
function ReturnAfterSignIn() {
  const ready = useAuthReady();
  const session = useAuthSession();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!ready || !session) return;
    const next = peekReturnPath();
    if (!next) return;
    const here = `${location.pathname}${location.search}`;
    if (here === next) {
      clearReturnPath();
      return;
    }
    navigate(next, { replace: true });
  }, [ready, session, location.pathname, location.search, navigate]);

  return null;
}
