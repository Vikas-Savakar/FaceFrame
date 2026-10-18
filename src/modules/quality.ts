import type { ImageDimensions, QualityCheck } from '../contracts';
import { MODEL_METHOD } from './detectionTypes.ts';
type Point = { x: number; y: number; z: number };
export function faceBounds(points: Point[]) { return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) }; }
/** Brightness-offset and contrast-scale invariant edge energy. Not a skin-tone/lighting test. */
export function normalizedSharpness(gray: Float32Array, width: number, height: number) {
  let sum = 0, square = 0, lap = 0, lapSquare = 0, n = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x, value = gray[i], l = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * value;
    sum += value; square += value * value; lap += l; lapSquare += l * l; n++;
  }
  if (!n) return 0;
  const variance = square / n - (sum / n) ** 2;
  return variance < 1e-8 ? 0 : Math.max(0, lapSquare / n - (lap / n) ** 2) / variance;
}
export function qualityChecks(points: Point[], size: ImageDimensions, sharpness: number): QualityCheck[] {
  const bounds = faceBounds(points), width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  const a = points[33], b = points[263], nose = points[1], top = points[10], chin = points[152];
  const roll = Math.abs(Math.atan2((b.y - a.y) * size.height, (b.x - a.x) * size.width) * 180 / Math.PI);
  const eyeRoll = Math.min(roll, Math.abs(180 - roll));
  const ld = Math.abs(nose.x - points[234].x), rd = Math.abs(points[454].x - nose.x);
  const yawAsymmetry = Math.abs(ld - rd) / Math.max(.001, ld + rd);
  const verticalNose = (nose.y - top.y) / Math.max(.001, chin.y - top.y);
  const check = (id: string, label: string, fail: boolean, explanation: string, caution = false): QualityCheck => ({ id, label, outcome: { status: 'ready', value: fail ? 'fail' : caution ? 'caution' : 'pass' }, explanation, provenance: 'calculated-geometry', method: { name: 'FaceFrame approximate capture checks', version: '2.0.0', sources: MODEL_METHOD.sources } });
  const checks = [
    check('size', 'Face size', width * size.width < 120 || height * size.height < 150 || width < .14 || height < .18, 'Use a photo where your face fills more of the frame, while keeping its full outline visible.'),
    check('framing', 'Full-face framing', bounds.left < .02 || bounds.right > .98 || bounds.top < .02 || bounds.bottom > .98, 'Leave some space around your full face. The detected outline is too close to an image edge.'),
    check('pose', 'Forward-facing pose', eyeRoll > 20 || yawAsymmetry > .48 || verticalNose < .28 || verticalNose > .78, 'Face forward at eye level, with your head level and a neutral expression. Pose checks are approximate.'),
    check('blur', 'Image detail', sharpness < .006, 'The detected face region may be blurred. Hold still, clean the lens and use even light. This texture-based check is fallible.', sharpness >= .006 && sharpness < .025),
  ];
  checks[3].provenance = 'calculated-image-quality';
  return checks;
}
