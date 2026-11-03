import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { OnboardingGate } from './OnboardingGate';
import { CalibratePage } from '../features/calibrate/CalibratePage';
import { ZenFlowV2 } from '../features/zen2/ZenFlowV2';
import { LiveViewV2 } from '../features/live/LiveViewV2';
import { DebugPage } from '../features/debug/DebugPage';
import { EyeBreakPage } from '../features/home/EyeBreakPage';
import { HomePage } from '../features/home/HomePage';
import { LiveViewPage } from '../features/live/LiveViewPage';
import { NeckCheckPage } from '../features/neck/NeckCheckPage';
import { WelcomePage } from '../features/onboarding/WelcomePage';
import { PrivacyPage } from '../features/privacy/PrivacyPage';
import { LoginPage } from '../features/site/LoginPage';
import { PrivacyPolicyPage, TermsPage } from '../features/site/LegalPage';
import { SiteHome } from '../features/site/SiteHome';
import { ProgressPage } from '../features/progress/ProgressPage';
import { RemindersPage } from '../features/reminders/RemindersPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { SpotFixPage } from '../features/spotcheck/SpotFixPage';
import { BreakPlayerPage } from '../features/stretches/BreakPlayerPage';
import { StretchDetailPage } from '../features/stretches/StretchDetailPage';
import { StretchLibraryPage } from '../features/stretches/StretchLibraryPage';

export const router = createBrowserRouter([
  // Public website: marketing home, sign-in, and draft legal pages.
  { path: '/', element: <SiteHome /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/privacy', element: <PrivacyPolicyPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    element: <AppShell />,
    children: [
      {
        element: <OnboardingGate />,
        children: [
          { path: '/app', element: <HomePage /> },
          { path: '/eye', element: <EyeBreakPage /> },
          { path: '/live', element: <LiveViewV2 /> },
          { path: '/live-legacy', element: <LiveViewPage /> },
          { path: '/progress', element: <ProgressPage /> },
          { path: '/reminders', element: <RemindersPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/spot-fix', element: <SpotFixPage /> },
          { path: '/app/privacy', element: <PrivacyPage /> },
          { path: '/calibrate', element: <CalibratePage /> },
          { path: '/set-my-zen', element: <ZenFlowV2 /> },
          { path: '/set-my-zen-legacy', element: <CalibratePage /> },
          { path: '/welcome', element: <WelcomePage /> },
          { path: '/break', element: <BreakPlayerPage /> },
          { path: '/stretches', element: <StretchLibraryPage /> },
          { path: '/stretches/:id', element: <StretchDetailPage /> },
          { path: '/neck', element: <NeckCheckPage /> },
          { path: '/debug', element: <DebugPage /> },
        ],
      },
    ],
  },
]);
