// Test-only failure injection. CPU initialization still uses the real library and real model.
import { FaceLandmarker } from '@mediapipe/tasks-vision';
const original = FaceLandmarker.createFromOptions;
FaceLandmarker.createFromOptions = (files, options) => {
  if (options.baseOptions?.delegate === 'GPU') return Promise.reject(new Error('Test-only GPU delegate failure'));
  return original.call(FaceLandmarker, files, options);
};
await import('../src/modules/face.worker');
self.postMessage({ type: 'harness-ready' });
export {};
