import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { AppDocumentGate } from './AppDocumentGate';
import { AppShell } from './AppShell';
import { OnboardingGate } from './OnboardingGate';
import { ZenFlowV2 } from '../features/zen2/ZenFlowV2';
import { LiveViewV2 } from '../features/live/LiveViewV2';
import { DebugPage } from '../features/debug/DebugPage';
import { EyeBreakPage } from '../features/home/EyeBreakPage';
import { HomePage } from '../features/home/HomePage';
import { NeckCheckPage } from '../features/neck/NeckCheckPage';
import { PrivacyPage } from '../features/privacy/PrivacyPage';
import { LoginPage } from '../features/site/LoginPage';
import { AfternoonSlumpPage, LearnIndexPage, StopSlouchingPage } from '../features/site/LearnPages';
import { PrivatePosturePage } from '../features/site/PrivatePosturePage';
import { SlouchTimerPage } from '../features/site/SlouchTimerPage';
import { StandStretchPage } from '../features/site/StandStretchPage';
import { MacWindowsPage } from '../features/site/MacWindowsPage';
import { NotFoundPage } from '../features/site/NotFoundPage';
import { PrivacyPolicyPage, TermsPage } from '../features/site/LegalPage';
import { SiteHome } from '../features/site/SiteHome';
import { WebcamPostureCheckerPage } from '../features/site/WebcamPostureCheckerPage';
import { ProgressPage } from '../features/progress/ProgressPage';
import { RemindersPage } from '../features/reminders/RemindersPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SpotFixPage } from '../features/spotcheck/SpotFixPage';
import { BreakPlayerPage } from '../features/stretches/BreakPlayerPage';
import { StretchDetailPage } from '../features/stretches/StretchDetailPage';
import { StretchLibraryPage } from '../features/stretches/StretchLibraryPage';

/** Old Welcome, Calibrate, and legacy Set my Zen links open the new Set my Zen. Keeps ?pose= and ?from=. */
function ToZen() {
  const params = new URLSearchParams(useLocation().search);
  const keep = new URLSearchParams();
  const pose = params.get('pose');
  const from = params.get('from');
  if (pose === 'sit' || pose === 'stand') keep.set('pose', pose);
  if (from) keep.set('from', from);
  const query = keep.toString();
  return <Navigate to={query ? `/set-my-zen?${query}` : '/set-my-zen'} replace />;
}

export const router = createBrowserRouter([
  // Public website: marketing home, sign-in, Privacy and Terms.
  // The marketing entry (index.html) serves these without the app bundle.
  // They stay here too so in-app links, like Settings → Sign in, still resolve.
  { path: '/', element: <SiteHome /> },
  { path: '/login', element: <LoginPage /> },
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
  // Guests and signed-in people share these routes. Sign-in is optional.
  {
    element: <AppDocumentGate />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <OnboardingGate />,
            children: [
              { path: '/app', element: <HomePage /> },
              { path: '/eye', element: <EyeBreakPage /> },
              { path: '/live', element: <LiveViewV2 /> },
              { path: '/live-legacy', element: <Navigate to="/live" replace /> },
              { path: '/progress', element: <ProgressPage /> },
              { path: '/reminders', element: <RemindersPage /> },
              { path: '/settings', element: <SettingsPage /> },
              { path: '/spot-fix', element: <SpotFixPage /> },
              { path: '/app/privacy', element: <PrivacyPage /> },
              { path: '/calibrate', element: <ToZen /> },
              { path: '/calibrate/*', element: <ToZen /> },
              { path: '/set-my-zen', element: <ZenFlowV2 /> },
              { path: '/set-my-zen-legacy', element: <ToZen /> },
              { path: '/welcome', element: <ToZen /> },
              { path: '/break', element: <BreakPlayerPage /> },
              { path: '/stretches', element: <StretchLibraryPage /> },
              { path: '/stretches/:id', element: <StretchDetailPage /> },
              { path: '/neck', element: <NeckCheckPage /> },
              { path: '/debug', element: <DebugPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
