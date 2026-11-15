import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** If the marketing bundle is opened on an app URL, load app.html for that same URL. */
export function HandOffToApp() {
  const location = useLocation();
  const href = `${location.pathname}${location.search}${location.hash}`;

  useLayoutEffect(() => {
    const key = 'deskzen.app-handoff';
    try {
      if (sessionStorage.getItem(key) === href) return;
      sessionStorage.setItem(key, href);
    } catch {
      // Still try the navigation below.
    }
    window.location.replace(href);
  }, [href]);

  return (
    <div className="grid min-h-dvh place-items-center bg-[#060807] px-6 text-white">
      <p>
        Opening DeskZen…{' '}
        <a href={href} className="font-semibold text-outline underline underline-offset-2">
          Continue
        </a>
      </p>
    </div>
  );
}
