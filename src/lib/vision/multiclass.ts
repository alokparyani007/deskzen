/**
 * Multiclass selfie segmenter (selfie_multiclass_256x256) for the ONE Step 2 snapshot.
 * Classes: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 others (accessories).
 * Loaded lazily, only when a snapshot is traced. The snapshot stays in memory; nothing is stored.
 */

export const MULTICLASS_MODEL = '/models/selfie_multiclass_256x256.tflite';

/** hair, body skin, face skin, clothes. Background and others (chairs, props) are left out. */
export const PERSON_CLASSES = [1, 2, 3, 4] as const;

export interface PersonMask {
  width: number;
  height: number;
  values: Float32Array;
  /** Class 5 "others" (glasses, hats, headphones): the tracer counts it as the person inside the head zone only. */
  others?: Float32Array;
  /** Class 4 clothes: the tracer ignores it beside the head well above the chin (a chair back read as clothes). */
  clothes?: Float32Array;
}

/** Person confidence = hair + face skin + body skin + clothes (clamped to 0..1). Null if the masks don't fit. */
export function mergePersonClasses(masks: readonly (Float32Array | null | undefined)[], width: number, height: number): Float32Array | null {
  const size = width * height;
  if (!(size > 0) || masks.length < 5) return null;
  const used = PERSON_CLASSES.map((index) => masks[index]);
  if (used.some((mask) => !mask || mask.length < size)) return null;
  const values = new Float32Array(size);
  for (const mask of used) {
    for (let index = 0; index < size; index += 1) values[index] = (values[index] ?? 0) + (mask![index] ?? 0);
  }
  for (let index = 0; index < size; index += 1) values[index] = Math.min(1, Math.max(0, values[index] ?? 0));
  return values;
}

interface MaskBuffer {
  width: number;
  height: number;
  getAsFloat32Array: () => Float32Array;
  close: () => void;
}

interface ImageModeSegmenter {
  segment(image: HTMLCanvasElement | OffscreenCanvas): { confidenceMasks?: MaskBuffer[] | null; close?: () => void } | void;
}

let loading: Promise<ImageModeSegmenter | null> | null = null;

export function loadMulticlassSegmenter(): Promise<ImageModeSegmenter | null> {
  loading ??= createSegmenter();
  return loading;
}

/** Person mask for one still canvas from the multiclass model, or null (caller falls back to the binary mask). */
export async function readMulticlassPersonMask(source: HTMLCanvasElement | OffscreenCanvas, width: number, height: number): Promise<PersonMask | null> {
  if (width <= 0 || height <= 0) return null;
  const segmenter = await loadMulticlassSegmenter();
  if (!segmenter) return null;
  let buffers: MaskBuffer[] = [];
  try {
    const result = segmenter.segment(source);
    buffers = (result && result.confidenceMasks) || [];
    const first = buffers[0];
    if (!first) return null;
    const copies = buffers.map((mask) => (mask.width === first.width && mask.height === first.height ? Float32Array.from(mask.getAsFloat32Array()) : null));
    const values = mergePersonClasses(copies, first.width, first.height);
    if (!values) return null;
    const others = copies[5] ?? undefined;
    const clothes = copies[4] ?? undefined;
    return { width: first.width, height: first.height, values, ...(others ? { others } : {}), ...(clothes ? { clothes } : {}) };
  } catch {
    return null;
  } finally {
    for (const mask of buffers) {
      try {
        mask.close();
      } catch {
        // already released
      }
    }
  }
}

async function createSegmenter(): Promise<ImageModeSegmenter | null> {
  try {
    const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
    const fileset = await FilesetResolver.forVisionTasks('/wasm');
    const options = {
      baseOptions: { modelAssetPath: MULTICLASS_MODEL },
      runningMode: 'IMAGE' as const,
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    };
    try {
      return (await ImageSegmenter.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' } })) as unknown as ImageModeSegmenter;
    } catch {
      return (await ImageSegmenter.createFromOptions(fileset, { ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' } })) as unknown as ImageModeSegmenter;
    }
  } catch {
    loading = null;
    return null;
  }
}
