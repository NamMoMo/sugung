import { mkdir, copyFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const target = resolve('public/mediapipe');
await mkdir(target, { recursive: true });
for (const file of await readdir('node_modules/@mediapipe/tasks-vision/wasm')) {
  await copyFile(resolve('node_modules/@mediapipe/tasks-vision/wasm', file), resolve(target, file));
}
const models = {
  'pose_landmarker_lite.task':'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'gesture_recognizer.task': 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
  'selfie_segmenter.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
  'selfie_multiclass.tflite': 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite',
};
for (const [name, url] of Object.entries(models)) {
  console.log(`Downloading ${name}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
  await writeFile(resolve(target, name), new Uint8Array(await response.arrayBuffer()));
}
console.log('MediaPipe models and WASM are ready locally.');
