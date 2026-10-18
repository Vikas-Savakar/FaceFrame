/** All photo-derived data is ephemeral. Never serialize to storage, logs or URLs. */
export type UnavailableCode = 'not-implemented' | 'unsupported' | 'permission-denied' | 'no-photo' | 'no-face' | 'multiple-faces' | 'poor-quality' | 'model-failed' | 'insufficient-data' | 'obstructed' | 'visibility-unassessed' | 'degenerate';
export interface UnavailableReason { code: UnavailableCode; message: string; phase?: 2 | 3 | 4 | 5 }
/** A pending result carries no invented value, confidence or percentage. */
export type Result<T> =
  | { status: 'empty' | 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'unavailable'; reason: UnavailableReason }
  | { status: 'error'; reason: string; recoverable: boolean };
export interface SourceReference { id: string; title: string; url: string; publisher: string; accessedAt: string }
export interface VersionedMethod { name: string; version: string; sources: SourceReference[] }
export interface ImageDimensions { width: number; height: number }
export interface ImageTransform {
  original: ImageDimensions;
  prepared: ImageDimensions;
  /** Applied in order: orientation, crop, resize, mirror. Coordinates use prepared image. */
  rotationDegrees: 0 | 90 | 180 | 270;
  /** Phase 2: orientation reflection precedes rotation; final preview is unmirrored. */
  orientation?: { exif: number; reflectedBeforeRotation: boolean; appliedBy: 'faceframe' };
  crop: { x: number; y: number; width: number; height: number } | null;
  mirrored: boolean;
  scale: { x: number; y: number };
}
export interface PhotoAsset {
  id: string;
  origin: 'upload' | 'camera-still';
  blob: Blob;
  mimeType: string;
  dimensions: ImageDimensions;
  transform: ImageTransform;
  createdAt: string;
}
export interface QualityCheck {
  id: string; label: string;
  outcome: Result<'pass' | 'caution' | 'fail'>;
  explanation: string;
  provenance: 'model-output' | 'calculated-geometry' | 'calculated-image-quality' | 'capture-metadata';
  method: VersionedMethod;
}
export interface LandmarkFrame {
  photoId: string;
  provenance: 'model-output';
  model: VersionedMethod;
  transform: ImageTransform;
  coordinateSpace: 'normalized-prepared-image';
  /** z is model-relative estimated depth; never physical depth or millimetres. */
  landmarks: Array<{ index: number; x: number; y: number; z: number }>;
  detectedFaceCount: number;
  confidence: Result<number>;
}
export interface Measurement {
  id: string; label: string;
  provenance: 'calculated-geometry';
  value: Result<number>;
  unit: 'ratio' | 'degrees' | 'normalized-image-distance';
  landmarkIndices: number[];
  method: VersionedMethod;
  limitations: string[];
  explanation?: string;
  formula?: string;
  visibility?: { status: 'unassessed' | 'clear' | 'obstructed'; reason: string };
  trace?: { coordinateSystem: 'prepared-image-pixels'; endpoints: Array<{ index: number; x: number; y: number }>; spans: Array<{ id: string; label: string; from: number; to: number; lengthPx: number }> };
}
export type FaceShape = 'oval' | 'round' | 'square' | 'oblong' | 'heart' | 'diamond' | 'triangular' | 'mixed' | 'uncertain';
export type VisibilityRegion = 'upper' | 'cheeks' | 'lower' | 'eyes' | 'nose';
export interface VisibilityAssessment {
  reviewed: boolean;
  /** User reports only. Unmarked regions are unassessed until reviewed is true. */
  obstructed: VisibilityRegion[];
  source: 'user-reported';
}
export interface FaceAnalysis {
  photoId: string;
  schemaVersion: '1.0.0';
  landmarks: Result<LandmarkFrame>;
  qualityChecks: QualityCheck[];
  measurements: Result<Measurement[]>;
  approximateShape: Result<{ label: FaceShape; provenance: 'calculated-geometry' | 'styling-interpretation'; method: VersionedMethod; rationale: string[]; suggestions?: Array<{ label: FaceShape; rationale: string[] }>; thresholds?: Record<string, number> }>;
  estimatedMesh: Result<{ provenance: 'calculated-geometry'; method: VersionedMethod; vertices: Array<{ x: number; y: number; z: number }>; triangles: Array<[number, number, number]> }>;
  limitations: string[];
  visibility?: VisibilityAssessment;
  geometryMethod?: VersionedMethod;
  shapeRules?: { method: VersionedMethod; thresholds: Record<string, number> };
  styling?: { preferences: StylingPreferences; recommendations: Recommendation[]; catalogVersion: string; imageCredits: Hairstyle['referenceImage'][] };
}
export interface Hairstyle {
  id: string; name: string; description: string;
  preferences: { length: string[]; texture: string[]; maintenance: string[] };
  referenceImage: Result<{ url: string; alt: string; creator: string; license: { name: string; url: string; attribution: string }; source: SourceReference; generated?: boolean; modifications?: string; reviewedAt?: string; generationRecord?: string }>;
}
export interface Recommendation {
  id: string;
  category: 'hairstyle' | 'sun-care' | 'jawline-styling';
  provenance: 'styling-advice';
  content: Result<{ title: string; explanation: string; hairstyleId?: string }>;
  rule: VersionedMethod;
  sources: SourceReference[];
  limitations: string[];
}

export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coiled';
export type HairLength = 'short' | 'medium' | 'long';
export interface StylingPreferences {
  texture: HairTexture | 'any'; currentLength: HairLength | 'any'; desiredLength: HairLength | 'any';
  stylingTime: 'any' | '5' | '15' | '30'; preferredStyles: string[];
  facialHair: 'unknown' | 'yes' | 'no'; allowGrowOut: boolean; useGeometry: boolean;
}
export interface CatalogStyle extends Hairstyle {
  length: HairLength; texture: HairTexture; maintenance: 'low' | 'medium' | 'high';
  dailyMinutes: number; tags: string[]; requirements: string; maintenanceNote: string; stylistBrief: string;
}
export interface ReportCareChoices { concern:'general'|'sun'|'pigmentation'; jawline:boolean }
export interface FinalReportData {
  generatedAt:string; photoPreparedAt:string; analysis:FaceAnalysis;
  selectedStyles:Array<{style:CatalogStyle;reason:string}>;
  care:ReportCareChoices; includePhoto:boolean; formatVersion:'5.0.0';
}
