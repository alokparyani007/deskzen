import { loadSettings, mergeSettings, saveSettings } from '../../lib/settings/store';

const CAMERA_KEY = 'sitglow.cameraDeviceId';

/** The camera the user picked. A separate key so other setting saves cannot drop it. */
export function loadCameraDeviceId(): string {
  try {
    const picked = window.localStorage.getItem(CAMERA_KEY);
    if (picked) return picked;
  } catch {
    /* Private mode can block storage. The default camera still works. */
  }
  return loadSettings().cameraDeviceId;
}

export function saveCameraDeviceId(deviceId: string): void {
  try {
    window.localStorage.setItem(CAMERA_KEY, deviceId);
  } catch {
    /* The session can continue with this camera even if it is not remembered. */
  }
  saveSettings(mergeSettings(loadSettings(), { cameraDeviceId: deviceId }));
}
