import { extractLandmarks, type RawLandmark } from './extract';
import { frameForInference, noteInference } from './inferenceFrame';
import type { Landmarks } from '../posture/types';

export interface VisionSession {
  detect(video: HTMLVideoElement, timestampMs: number): Landmarks | null;
  /** One still frame. Reuses the loaded models. Timestamps stay increasing. */
  detectFrame(source: HTMLCanvasElement | OffscreenCanvas, width: number, height: number): Landmarks | null;
  close(): void;
}

let sessionPromise: Promise<VisionSession> | null = null;

/**
 * Loads pose and face models from this app's own /models and /wasm folders.
 * Nothing here is sent to a server. Landmarks stay in memory for the current frame.
 */
export function loadVisionSession(): Promise<VisionSession> {
  sessionPromise ??= createSession();
  return sessionPromise;
}

async function createSession(): Promise<VisionSession> {
  const { FaceLandmarker, FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks('/wasm');
  const pose = await createPose(PoseLandmarker, fileset);
  const face = await createFace(FaceLandmarker, fileset);
  let lastTimestamp = 0;

  const read = (
    poseResult: { landmarks: RawLandmark[][] },
    faceResult: { faceLandmarks: RawLandmark[][]; facialTransformationMatrixes?: { data: ArrayLike<number> }[] },
    timestamp: number,
    videoWidth: number,
    videoHeight: number,
  ): Landmarks =>
    extractLandmarks({
      pose: poseResult.landmarks[0],
      faces: faceResult.faceLandmarks,
      facialMatrices: faceResult.facialTransformationMatrixes?.map((matrix) => matrix.data),
      timestampMs: timestamp,
      videoWidth,
      videoHeight,
    });

  return {
    detect(video, timestampMs) {
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
        return null;
      }
      const timestamp = timestampMs > lastTimestamp ? timestampMs : lastTimestamp + 1;
      lastTimestamp = timestamp;
      const started = performance.now();
      const source = frameForInference(video);
      const poseResult = pose.detectForVideo(source, timestamp);
      const faceResult = face.detectForVideo(source, timestamp);
      noteInference(performance.now() - started);
      return read(poseResult, faceResult, timestamp, video.videoWidth, video.videoHeight);
    },
    detectFrame(source, width, height) {
      if (width <= 0 || height <= 0) return null;
      lastTimestamp += 1;
      const started = performance.now();
      const poseResult = pose.detectForVideo(source as HTMLCanvasElement, lastTimestamp);
      const faceResult = face.detectForVideo(source as HTMLCanvasElement, lastTimestamp);
      noteInference(performance.now() - started);
      return read(poseResult, faceResult, lastTimestamp, width, height);
    },
    close() {
      pose.close();
      face.close();
      sessionPromise = null;
    },
  };
}

async function createPose(
  PoseLandmarker: typeof import('@mediapipe/tasks-vision').PoseLandmarker,
  fileset: Awaited<ReturnType<(typeof import('@mediapipe/tasks-vision'))['FilesetResolver']['forVisionTasks']>>,
) {
  const options = {
    baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
    runningMode: 'VIDEO' as const,
    numPoses: 1,
  };
  try {
    return await PoseLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    });
  } catch {
    return PoseLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' },
    });
  }
}

async function createFace(
  FaceLandmarker: typeof import('@mediapipe/tasks-vision').FaceLandmarker,
  fileset: Awaited<ReturnType<(typeof import('@mediapipe/tasks-vision'))['FilesetResolver']['forVisionTasks']>>,
) {
  const options = {
    baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
    runningMode: 'VIDEO' as const,
    numFaces: 2,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  };
  try {
    return await FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'GPU' },
    });
  } catch {
    return FaceLandmarker.createFromOptions(fileset, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: 'CPU' },
    });
  }
}
