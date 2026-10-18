import type { LandmarkFrame, PhotoAsset, QualityCheck, Result } from '../contracts';
export interface DetectionOutput { frame: Result<LandmarkFrame>; checks: QualityCheck[]; connections: Array<{ start: number; end: number }>; detectedFaceCount: number }
export type WorkerInput = { type: 'init'; base: string; delegate: 'GPU' | 'CPU' } | { type: 'detect'; bitmap: ImageBitmap; photo: Omit<PhotoAsset, 'blob'> };
export type WorkerOutput = { type: 'ready'; delegate: 'GPU' | 'CPU'; fallback: boolean } | { type: 'result'; result: DetectionOutput } | { type: 'error'; stage: 'init' | 'detect' };
export const MODEL_METHOD = { name: 'MediaPipe Face Landmarker (float16 model v1)', version: 'tasks-vision@1.1.1 / float16/1', sources: [{ id: 'mediapipe-web', title: 'Face Landmarker Web guide', url: 'https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js', publisher: 'Google AI Edge', accessedAt: '2026-10-18' }] };
