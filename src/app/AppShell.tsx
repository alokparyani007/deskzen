import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { trackUsage } from '../lib/usage/track';
import { isImmersivePath } from './nav';
import { Sidebar } from '../components/Sidebar';
import { TabBar } from '../components/TabBar';
import { CameraPill } from '../features/camera/CameraPill';
import { CameraProvider } from '../features/camera/camera-context';
import { BaselineProvider } from '../features/posture/baseline-context';
import { SessionChrome } from '../features/session/SessionChrome';
import { SessionProvider } from '../features/session/session-context';
import { ModeBar } from '../features/wellness/ModeBar';
import { WellnessProvider } from '../features/wellness/wellness-context';

export function AppShell() {
  useEffect(() => {
    trackUsage('app_open');
  }, []);
  return (
    <CameraProvider>
      <BaselineProvider>
        <SessionProvider>
          <WellnessProvider>
            <Shell />
          </WellnessProvider>
        </SessionProvider>
      </BaselineProvider>
    </CameraProvider>
  );
}

function Shell() {
  const path = useLocation().pathname;
  const home = path === '/app';
  const immersive = isImmersivePath(path);
  return (
    <div className="min-h-dvh bg-stage text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:text-ink focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh w-full">
        {immersive ? null : <Sidebar />}
        <main id="main" className={home ? 'min-w-0 flex-1' : 'min-w-0 flex-1 bg-stage pb-20 md:pb-0'}>
          {immersive || home ? null : <ModeBar />}
          <Outlet />
        </main>
      </div>
      {immersive ? null : <TabBar />}
      {immersive ? null : <CameraPill />}
      <SessionChrome />
    </div>
  );
}
