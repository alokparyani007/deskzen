import { createBrowserRouter } from 'react-router-dom';
import { HandOffToApp } from './HandOffToApp';
import { LoginPage } from './LoginPage';
import { AfternoonSlumpPage, LearnIndexPage, StopSlouchingPage } from './LearnPages';
import { PrivacyPolicyPage, TermsPage } from './LegalPage';
import { SiteHome } from './SiteHome';

const publicRoutes = [
  { path: '/', element: <SiteHome /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/privacy', element: <PrivacyPolicyPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/learn', element: <LearnIndexPage /> },
  { path: '/learn/stop-slouching-at-your-desk', element: <StopSlouchingPage /> },
  { path: '/learn/afternoon-slump', element: <AfternoonSlumpPage /> },
];

/** Marketing bundle only. App routes do a full load so the server sends app.html. */
export const siteRouter = createBrowserRouter([
  ...publicRoutes,
  { path: '*', element: <HandOffToApp /> },
]);
