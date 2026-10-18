import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { WorkerInput, WorkerOutput } from './detectionTypes';
import { MODEL_METHOD } from './detectionTypes';
import { faceBounds, normalizedSharpness, qualityChecks } from './quality';
// Vendor debug output is suppressed so raw runtime errors can never carry photo-derived data.
console.log = console.info = console.warn = console.error = console.debug = () => {};
const send = (message: WorkerOutput) => self.postMessage(message);
let model: FaceLandmarker | undefined;
let busy = false;
self.onmessage = async (event: MessageEvent<WorkerInput>) => {
  const data = event.data;
  if (busy) { if (data.type === 'detect') data.bitmap.close(); return; }
  busy = true;
  try {
    if (data.type === 'init') {
      const files = await FilesetResolver.forVisionTasks(`${data.base}vendor/mediapipe/1.1.1/wasm`, true);
      const response = await fetch(`${data.base}models/face_landmarker-float16-v1.task`, { credentials: 'omit' });
      if (!response.ok) throw new Error();
      const buffer = new Uint8Array(await response.arrayBuffer());
      const create = (delegate: 'GPU' | 'CPU') => FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetBuffer: buffer, delegate }, runningMode: 'IMAGE', numFaces: 2,
        minFaceDetectionConfidence: .5, minFacePresenceConfidence: .5,
        outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false,
      });
      let delegate = data.delegate;
      try { model = await create(delegate); }
      catch { if (delegate === 'CPU') throw new Error(); delegate = 'CPU'; model = await create('CPU'); }
      send({ type: 'ready', delegate, fallback: delegate !== data.delegate });
    } else {
      const { bitmap, photo } = data;
      try {
        if (!model) throw new Error();
        const result = model.detect(bitmap), count = result.faceLandmarks.length;
        if (count !== 1) {
          send({ type: 'result', result: { frame: { status: 'unavailable', reason: { code: count ? 'multiple-faces' : 'no-face', message: count ? 'More than one face was detected. Choose a photo with only you in the frame.' : 'No face was detected. Face forward, keep your full face visible and try even lighting.' } }, checks: [], connections: [], detectedFaceCount: count } }); return;
        }
        const points = result.faceLandmarks[0];
        if (points.length < 468 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z))) throw new Error();
        const bounds = faceBounds(points);
        const canvas = new OffscreenCanvas(256, 256), ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error();
        const x = Math.max(0, bounds.left * bitmap.width), y = Math.max(0, bounds.top * bitmap.height);
        const w = Math.max(1, Math.min(bitmap.width - x, (bounds.right - bounds.left) * bitmap.width));
        const h = Math.max(1, Math.min(bitmap.height - y, (bounds.bottom - bounds.top) * bitmap.height));
        ctx.drawImage(bitmap, x, y, w, h, 0, 0, 256, 256);
        const image = ctx.getImageData(0, 0, 256, 256), gray = new Float32Array(256 * 256);
        for (let i = 0; i < gray.length; i++) gray[i] = .2126 * image.data[i * 4] + .7152 * image.data[i * 4 + 1] + .0722 * image.data[i * 4 + 2];
        const checks = qualityChecks(points, photo.dimensions, normalizedSharpness(gray, 256, 256));
        gray.fill(0); image.data.fill(0); canvas.width = canvas.height = 0;
        const failed = checks.filter(c => c.outcome.status === 'ready' && c.outcome.value === 'fail');
        send({ type: 'result', result: {
          frame: failed.length ? { status: 'unavailable', reason: { code: 'poor-quality', message: 'Please retake or choose another photo. ' + failed.map(c => c.explanation).join(' ') } } : { status: 'ready', value: { photoId: photo.id, provenance: 'model-output', model: MODEL_METHOD, transform: photo.transform, coordinateSpace: 'normalized-prepared-image', landmarks: points.map((p, index) => ({ index, x: p.x, y: p.y, z: p.z })), detectedFaceCount: count, confidence: { status: 'unavailable', reason: { code: 'insufficient-data', message: 'This API does not expose per-landmark confidence or an overall result confidence.' } } } },
          checks, connections: failed.length ? [] : FaceLandmarker.FACE_LANDMARKS_CONTOURS, detectedFaceCount: count,
        } });
      } finally { bitmap.close(); }
    }
  } catch { model?.close(); model = undefined; send({ type: 'error', stage: data.type === 'init' ? 'init' : 'detect' }); }
  finally { busy = false; }
};
