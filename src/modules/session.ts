import type { FaceAnalysis, PhotoAsset, Result } from '../contracts';
import type { DetectionOutput } from './detectionTypes';
/** Only held in App state. Never serialized. */
export interface AnalysisSession { photo: PhotoAsset; detection: DetectionOutput; analysis: Result<FaceAnalysis> }
