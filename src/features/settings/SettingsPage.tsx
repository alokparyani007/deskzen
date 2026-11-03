import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/usePageTitle';
import { auth, useAuthSession } from '../../lib/auth';
import type { DeskId } from '../../lib/posture/profiles';
import { applyWorkStyle, calibrationNeeded } from '../../lib/settings/visibility';
import { deleteAllLocalData } from '../../lib/storage/local-data';
import { speakCaption } from '../calibrate/glowVoice';
import { useCamera } from '../camera/camera-context';
import { useBaseline } from '../posture/baseline-context';
import { useSession } from '../session/session-context';
import { SettingsView, type NotificationStatus } from './SettingsView';

function permission(): NotificationStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function SettingsPage() {
  usePageTitle('Settings');
  const navigate = useNavigate();
  const { settings, updateSettings, resetStrictness, exportData } = useSession();
  const { baseline, standing, clear, profiles, activeProfileId, selectProfile } = useBaseline();
  const camera = useCamera();
  const [notification, setNotification] = useState<NotificationStatus>(permission);
  const refreshDevices = camera.refreshDevices;
  const account = useAuthSession();

  useEffect(() => {
    void refreshDevices();
  }, [refreshDevices]);

  return (
    <SettingsView
      settings={settings}
      onUpdate={updateSettings}
      onConfirmStyle={(style) => {
        const next = applyWorkStyle(settings, style);
        updateSettings(next);
        const pose = calibrationNeeded(next.workStyle, baseline !== null, standing !== null);
        if (pose) navigate(`/set-my-zen?pose=${pose}&from=settings`);
      }}
      cameras={camera.devices}
      cameraId={camera.deviceId}
      onSelectCamera={(deviceId) => void camera.selectCamera(deviceId)}
      sittingSaved={baseline !== null}
      standingSaved={standing !== null}
      profiles={profiles}
      activeProfileId={activeProfileId}
      onSelectProfile={(id) => void selectProfile(id as DeskId)}
      notification={notification}
      onToggleNotifications={(on) => {
        if (!on) {
          updateSettings({ notifications: false });
          return;
        }
        if (!('Notification' in window)) return;
        void Notification.requestPermission().then((result) => {
          setNotification(result);
          updateSettings({ notifications: result === 'granted' });
        });
      }}
      onPlaySample={() => speakCaption("Here's a voice tip. Relax your shoulders and sit tall.", false)}
      onExport={() => void exportData()}
      onDeleteAll={() => {
        void clear()
          .then(() => deleteAllLocalData())
          .then(() => navigate('/app'));
      }}
      onReset={() => {
        const name = settings.name;
        resetStrictness();
        if (name) updateSettings({ name });
      }}
      version={__APP_VERSION__}
      accountEmail={account?.user.email ?? null}
      onSignOut={account ? () => void auth.signOut().then(() => navigate('/login', { replace: true })) : undefined}
    />
  );
}
