import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const models = [
  [
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    'public/models/pose_landmarker_lite.task',
  ],
  [
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
    'public/models/face_landmarker.task',
  ],
  [
    // Step 2 snapshot only: hair / face skin / body skin / clothes classes, so a chair is not traced as the body.
    'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
    'public/models/selfie_multiclass_256x256.tflite',
  ],
];

const wasmFiles = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

await mkdir(join(root, 'public/models'), { recursive: true });
await mkdir(join(root, 'public/wasm'), { recursive: true });

for (const [url, relativePath] of models) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url} (${response.status})`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(join(root, relativePath), bytes);
  console.log(`saved ${relativePath} (${bytes.length} bytes)`);
}

const pkg = JSON.parse(
  await readFile(join(root, 'node_modules/@mediapipe/tasks-vision/package.json'), 'utf8'),
);
const version = pkg.version;

for (const file of wasmFiles) {
  const destination = join(root, 'public/wasm', file);
  const cdn = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm/${file}`;
  try {
    const response = await fetch(cdn);
    if (!response.ok) throw new Error(String(response.status));
    await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    console.log(`saved public/wasm/${file} from ${version}`);
  } catch {
    await copyFile(join(root, 'node_modules/@mediapipe/tasks-vision/wasm', file), destination);
    console.log(`copied public/wasm/${file} from the installed package`);
  }
}
