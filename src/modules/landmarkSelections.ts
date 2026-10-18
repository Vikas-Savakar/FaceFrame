import type { VisibilityRegion } from '../contracts';
/** Zero-based selections verified against pinned FACE_OVAL/eye edges and canonical OBJ, not anatomy. */
export const SPANS = {
  height: { label: 'Visible contour height', from: 10, to: 152, regions: ['upper', 'lower'] },
  cheek: { label: 'Visible cheek-contour span', from: 234, to: 454, regions: ['cheeks'] },
  lower: { label: 'Lower-face contour span', from: 172, to: 397, regions: ['lower'] },
  upper: { label: 'Upper-face contour span', from: 54, to: 284, regions: ['upper'] },
  lowerHeight: { label: 'Nose-base to chin span', from: 2, to: 152, regions: ['nose', 'lower'] },
  eyeGap: { label: 'Inner eye-corner spacing', from: 133, to: 362, regions: ['eyes'] },
} satisfies Record<string, { label: string; from: number; to: number; regions: VisibilityRegion[] }>;
export type SpanId = keyof typeof SPANS;
export const JAW_CHORD = { label: 'Viewer-left lower-contour chord angle', indices: [132, 172, 152] as const, regions: ['cheeks', 'lower'] as VisibilityRegion[] };
export const LANDMARK_NAMES: Record<number, string> = {
  10: 'Top of visible model contour (not hairline)', 152: 'Chin contour endpoint',
  234: 'Viewer-left lateral cheek contour', 454: 'Viewer-right lateral cheek contour',
  172: 'Viewer-left lower contour bend selection', 397: 'Viewer-right lower contour selection',
  54: 'Viewer-left upper contour', 284: 'Viewer-right upper contour',
  2: 'Central nose-base surface selection', 133: 'Viewer-left inner eye corner', 362: 'Viewer-right inner eye corner',
  132: 'Viewer-left side contour selection',
};
export const GEOMETRY_METHOD = { name: 'FaceFrame image-plane chord geometry', version: '3.0.0', sources: [
  { id: 'mp-coordinate-definition', title: 'NormalizedLandmark coordinate definition', publisher: 'Google AI Edge', url: 'https://developers.google.com/edge/api/mediapipe/js/tasks-vision.normalizedlandmark', accessedAt: '2026-10-18' },
  { id: 'mp-topology', title: 'Official face mesh connection indices', publisher: 'Google MediaPipe Authors', url: 'https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/face_mesh_connections.py', accessedAt: '2026-10-18' },
  { id: 'mp-canonical-index-reference', title: 'Canonical face model (index verification only)', publisher: 'Google MediaPipe Authors', url: 'https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj', accessedAt: '2026-10-18' },
] };
