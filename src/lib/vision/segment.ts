import { frameForInference, noteInference, type InferenceSource } from './inferenceFrame';

let loading: Promise<Segmenter | null> | null = null;

interface MaskBuffer {
  width: number;
  height: number;
  getAsFloat32Array: () => Float32Array;
  close: () => void;
}

interface Segmenter {
  segmentForVideo(video: InferenceSource, timestamp: number): {
    confidenceMasks?: MaskBuffer[] | null;
  };
}

/** Lazy selfie segmenter. Used only while building a Posture Print, not during the work day. */
export function loadSegmenter(): Promise<Segmenter | null> {
  loading ??= createSegmenter();
  return loading;
}

export async function readPersonMask(
  video: HTMLVideoElement,
  timestamp: number,
  probes: { x: number; y: number }[] = [],
): Promise<{ width: number; height: number; values: Float32Array } | null> {
  if (video.readyState < 2 || video.videoWidth === 0) return null;
  const segmenter = await loadSegmenter();
  if (!segmenter) return null;
  try {
    const started = performance.now();
    const result = segmenter.segmentForVideo(frameForInference(video), nextSegStamp(timestamp));
    noteInference(performance.now() - started);
    const buffers = result.confidenceMasks ?? [];
    const first = buffers[0];
    if (!first) return null;
    const width = first.width;
    const height = first.height;
    const copies: Float32Array[] = [];
    for (const mask of buffers) {
      if (mask.width === width && mask.height === height) copies.push(Float32Array.from(mask.getAsFloat32Array()));
      mask.close();
    }
    const maskProbes = probes.map((point) => ({ x: point.x * width / video.videoWidth, y: point.y * height / video.videoHeight }));
    const { choosePersonValues, orientPersonConfidence } = await import('../posture/silhouette');
    const chosen = choosePersonValues(copies, width, height, maskProbes);
    const oriented = orientPersonConfidence(chosen, width, height, maskProbes);
    return { width, height, values: oriented.values };
  } catch {
    return null;
  }
}

/** Same as readPersonMask, for one still canvas. Does not load a second model. */
export async function readPersonMaskFrom(
  source: HTMLCanvasElement | OffscreenCanvas,
  width: number,
  height: number,
  probes: { x: number; y: number }[] = [],
): Promise<{ width: number; height: number; values: Float32Array } | null> {
  if (width <= 0 || height <= 0) return null;
  const segmenter = await loadSegmenter();
  if (!segmenter) return null;
  segTimestamp += 1;
  try {
    const started = performance.now();
    const result = segmenter.segmentForVideo(source, nextSegStamp(segTimestamp));
    noteInference(performance.now() - started);
    return valuesFromMasks(result.confidenceMasks, width, height, probes);
  } catch {
    return null;
  }
}

let segTimestamp = 0;

function nextSegStamp(timestamp: number): number {
  segTimestamp = Math.max(segTimestamp + 1, Math.max(1, timestamp));
  return segTimestamp;
}

async function valuesFromMasks(
  buffers: MaskBuffer[] | null | undefined,
  videoWidth: number,
  videoHeight: number,
  probes: { x: number; y: number }[],
): Promise<{ width: number; height: number; values: Float32Array } | null> {
  const masks = buffers ?? [];
  const first = masks[0];
  if (!first) return null;
  const width = first.width;
  const height = first.height;
  const copies: Float32Array[] = [];
  for (const mask of masks) {
    if (mask.width === width && mask.height === height) copies.push(Float32Array.from(mask.getAsFloat32Array()));
    mask.close();
  }
  const maskProbes = probes.map((point) => ({ x: point.x * width / videoWidth, y: point.y * height / videoHeight }));
  const { choosePersonValues, orientPersonConfidence } = await import('../posture/silhouette');
  const chosen = choosePersonValues(copies, width, height, maskProbes);
  const oriented = orientPersonConfidence(chosen, width, height, maskProbes);
  return { width, height, values: oriented.values };
}

async function createSegmenter(): Promise<Segmenter | null> {
  try {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks('/wasm');
    const options = {
      baseOptions: { modelAssetPath: '/models/selfie_segmenter.tflite' },
      runningMode: 'VIDEO' as const,
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    };
    try {
      return (await ImageSegmenter.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } })) as Segmenter;
    } catch {
      return (await ImageSegmenter.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } })) as Segmenter;
    }
  } catch {
    loading = null;
    return null;
  }
}
