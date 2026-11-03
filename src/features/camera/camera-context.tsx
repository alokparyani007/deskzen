import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { postureConfig } from '../../lib/posture/config';
import { loadCameraDeviceId, saveCameraDeviceId } from './cameraDevice';
import { hdConstraints, isHdResolution, vgaConstraints } from './constraints';
import { restartAfterMove, resumeIfPaused } from './resumeVideo';

export type CameraStatus = 'idle' | 'requesting' | 'live' | 'paused' | 'denied' | 'unavailable';

export interface CameraChoice {
  deviceId: string;
  label: string;
}

export interface CameraSize {
  width: number;
  height: number;
}

interface CameraContextValue {
  status: CameraStatus;
  errorName: string | null;
  attachVideo: (node: HTMLVideoElement | null) => void;
  videoElement: HTMLVideoElement | null;
  placeVideo: (slot: HTMLElement | null) => void;
  start: () => Promise<boolean>;
  resume: () => Promise<boolean>;
  pause: () => void;
  lastError: () => string | null;
  resolution: CameraSize | null;
  hd: boolean;
  deviceId: string;
  devices: CameraChoice[];
  refreshDevices: () => Promise<void>;
  selectCamera: (deviceId: string) => Promise<boolean>;
}

const CameraContext = createContext<CameraContextValue | null>(null);

export function CameraProvider({ children }: { children: ReactNode }) {
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const parkRef = useRef<HTMLDivElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [errorName, setErrorName] = useState<string | null>(null);
  const [resolution, setResolution] = useState<CameraSize | null>(null);
  const [devices, setDevices] = useState<CameraChoice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const deviceRef = useRef('');
  const errorRef = useRef<string | null>(null);
  const statusRef = useRef(status);
  const skipPauseRef = useRef(false);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const pause = useCallback(() => {
    stopTracks();
    setResolution(null);
    setStatus('paused');
  }, [stopTracks]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const listed = await navigator.mediaDevices.enumerateDevices();
    const cameras = listed
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Camera ${index + 1}` }));
    setDevices(cameras);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorName('NotFoundError');
      setStatus('unavailable');
      return false;
    }
    setStatus('requesting');
    errorRef.current = null;
    setErrorName(null);
    stopTracks();
    const picked = deviceRef.current || loadCameraDeviceId();
    deviceRef.current = picked;
    setDeviceId(picked);
    try {
      const stream = await openCamera(picked);
      streamRef.current = stream;
      const size = trackSize(stream);
      setResolution(size);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('live');
      void refreshDevices();
      return true;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : 'Error';
      errorRef.current = name;
      setErrorName(name);
      setResolution(null);
      const denied = name === 'NotAllowedError' || name === 'PermissionDeniedError';
      setStatus(denied ? 'denied' : 'unavailable');
      return false;
    }
  }, [refreshDevices, stopTracks]);

  const selectCamera = useCallback(async (nextId: string): Promise<boolean> => {
    deviceRef.current = nextId;
    setDeviceId(nextId);
    saveCameraDeviceId(nextId);
    if (statusRef.current === 'paused' || statusRef.current === 'idle') return true;
    return start();
  }, [start]);

  const resume = useCallback(async (): Promise<boolean> => {
    const video = videoRef.current;
    const stream = streamRef.current;
    const alive = stream?.getTracks().some((track) => track.readyState === 'live') ?? false;
    if (!alive) return start();
    if (video) {
      if (video.srcObject !== stream) video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* The paused bar stays until frames come back. */
      }
    }
    setStatus('live');
    return true;
  }, [start]);

  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    setVideoElement(node);
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      void node.play();
    }
  }, []);

  const placeVideo = useCallback((slot: HTMLElement | null) => {
    const video = videoRef.current;
    const park = parkRef.current;
    if (!video || !park) return;
    (slot ?? park).appendChild(video);
    skipPauseRef.current = true;
    restartAfterMove(video);
    skipPauseRef.current = false;
  }, []);

  useEffect(() => stopTracks, [stopTracks]);

  useEffect(() => {
    const video = videoElement;
    if (!video) return;
    let resuming = false;
    const onPause = () => {
      if (skipPauseRef.current || resuming || statusRef.current !== 'live' || document.hidden) return;
      resuming = true;
      resumeIfPaused(video);
      resuming = false;
    };
    video.addEventListener('pause', onPause);
    return () => video.removeEventListener('pause', onPause);
  }, [videoElement]);

  useEffect(() => {
    let timer = 0;
    const onVisibility = () => {
      window.clearTimeout(timer);
      if (document.hidden && statusRef.current === 'live') {
        timer = window.setTimeout(() => {
          if (document.hidden && statusRef.current === 'live') pause();
        }, postureConfig.hideCameraAfterMs);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer);
    };
  }, [pause]);

  const lastError = useCallback(() => errorRef.current, []);

  const hd = resolution ? isHdResolution(resolution.width, resolution.height) : false;
  const value = useMemo(
    () => ({
      status,
      errorName,
      attachVideo,
      videoElement,
      placeVideo,
      start,
      resume,
      pause,
      lastError,
      resolution,
      hd,
      deviceId,
      devices,
      refreshDevices,
      selectCamera,
    }),
    [status, errorName, attachVideo, videoElement, placeVideo, start, resume, pause, lastError, resolution, hd, deviceId, devices, refreshDevices, selectCamera],
  );

  return (
    <CameraContext.Provider value={value}>
      <div ref={parkRef} className="pointer-events-none fixed left-0 top-0 -z-10 h-[480px] w-[640px] overflow-hidden opacity-0" aria-hidden="true">
        <video ref={attachVideo} className="absolute inset-0 h-full w-full -scale-x-100 object-fill" playsInline muted autoPlay />
      </div>
      {children}
    </CameraContext.Provider>
  );
}

export function useCamera(): CameraContextValue {
  const value = useContext(CameraContext);
  if (!value) throw new Error('useCamera must be used inside CameraProvider');
  return value;
}

async function openCamera(deviceId: string): Promise<MediaStream> {
  const attempts = [hdConstraints(deviceId), vgaConstraints(deviceId)];
  if (deviceId) {
    attempts.push(hdConstraints(''), vgaConstraints(''));
  }
  let last: unknown = new DOMException('The camera did not start.', 'NotFoundError');
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      last = error;
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') throw error;
    }
  }
  throw last;
}

function trackSize(stream: MediaStream): CameraSize | null {
  const settings = stream.getVideoTracks()[0]?.getSettings();
  if (!settings?.width || !settings.height) return null;
  return { width: settings.width, height: settings.height };
}
