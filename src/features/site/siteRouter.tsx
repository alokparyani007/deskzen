import { useLocation, createBrowserRouter } from 'react-router-dom';
import { HandOffToApp } from './HandOffToApp';
import { AboutPage } from './AboutPage';
import { ContactPage } from './ContactPage';
import { LoginPage } from './LoginPage';
import { AfternoonSlumpPage, LearnIndexPage, StopSlouchingPage } from './LearnPages';
import { PrivatePosturePage } from './PrivatePosturePage';
import { SlouchTimerPage } from './SlouchTimerPage';
import { StandStretchPage } from './StandStretchPage';
import { MacWindowsPage } from './MacWindowsPage';
import { NotFoundPage } from './NotFoundPage';
import { PrivacyPolicyPage, TermsPage } from './LegalPage';
import { isKnownAppPath } from './publicRoutes';
import { SiteHome } from './SiteHome';
import { WebcamPostureCheckerPage } from './WebcamPostureCheckerPage';

const publicRoutes = [
  { path: '/', element: <SiteHome /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/privacy', element: <PrivacyPolicyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/learn', element: <LearnIndexPage /> },
  { path: '/learn/stop-slouching-at-your-desk', element: <StopSlouchingPage /> },
  { path: '/learn/afternoon-slump', element: <AfternoonSlumpPage /> },
  { path: '/learn/slouch-detector-vs-sit-up-timer', element: <SlouchTimerPage /> },
  { path: '/learn/stand-up-and-stretch-reminders', element: <StandStretchPage /> },
  { path: '/learn/private-posture-reminder', element: <PrivatePosturePage /> },
  { path: '/webcam-posture-checker', element: <WebcamPostureCheckerPage /> },
  { path: '/posture-reminder-mac-windows', element: <MacWindowsPage /> },
];

/** App URLs that landed in the marketing bundle need app.html. Anything else is a real miss. */
function SiteCatchAll() {
  const { pathname } = useLocation();
  if (isKnownAppPath(pathname)) return <HandOffToApp />;
  return <NotFoundPage />;
}

/** Marketing bundle only. App routes do a full load so the server sends app.html. */
export const siteRouter = createBrowserRouter([
  ...publicRoutes,
  { path: '*', element: <SiteCatchAll /> },
]);
