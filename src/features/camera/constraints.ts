export interface CameraSize {
  width: number;
  height: number;
}

const HD = { width: 1280, height: 720 };
const VGA = { width: 640, height: 480 };

/** Ideal 720p. deviceId is set only after the user picks a camera. */
export function hdConstraints(deviceId = ''): MediaStreamConstraints {
  return constraints(HD, deviceId);
}

export function vgaConstraints(deviceId = ''): MediaStreamConstraints {
  return constraints(VGA, deviceId);
}

export function isHdResolution(width: number, height: number): boolean {
  return width >= HD.width && height >= HD.height;
}

function constraints(size: CameraSize, deviceId: string): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: size.width },
    height: { ideal: size.height },
    frameRate: { ideal: 30 },
    facingMode: 'user',
  };
  if (deviceId) video.deviceId = { exact: deviceId };
  return { video, audio: false };
}
