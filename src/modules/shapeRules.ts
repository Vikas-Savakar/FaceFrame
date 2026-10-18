import type { FaceAnalysis, FaceShape, Measurement, VisibilityAssessment } from '../contracts';
import { GEOMETRY_METHOD } from './landmarkSelections.ts';
export const SHAPE_THRESHOLDS = {
  shortMax: 1.30, ovalMin: 1.20, ovalMax: 1.50, longMin: 1.50,
  narrowLowerMax: .78, broadLowerMin: .82, broadUpperMin: .78, narrowUpperMax: .82,
  upperLowerDifference: .08, balancedDifferenceMax: .10, roundLowerMin: .62,
} as const;
export type ShapeThresholds = { [K in keyof typeof SHAPE_THRESHOLDS]: number };
export const SHAPE_METHOD = { name: 'FaceFrame provisional styling shape rules', version: '3.0.0', sources: GEOMETRY_METHOD.sources };
const unavailable = (message: string): FaceAnalysis['approximateShape'] => ({ status: 'unavailable', reason: { code: 'insufficient-data', message } });
export function estimateShape(measurements: Measurement[], visibility: VisibilityAssessment, thresholds: ShapeThresholds = SHAPE_THRESHOLDS): FaceAnalysis['approximateShape'] {
  if (!visibility.reviewed) return { status: 'unavailable', reason: { code: 'visibility-unassessed', message: 'Review contour visibility before using shape suggestions. Automatic obstruction assessment is not available.' } };
  if (visibility.obstructed.some(region => ['upper','cheeks','lower'].includes(region))) return { status: 'unavailable', reason: { code: 'obstructed', message: 'A contour used by the shape rules is obscured. Choose a clearer photo instead of forcing a category.' } };
  if (Object.values(thresholds).some(value => !Number.isFinite(value) || value < 0)) return unavailable('Shape-rule configuration is invalid.');
  const get = (id: string) => { const value = measurements.find(m => m.id === id)?.value; return value?.status === 'ready' ? value.value : undefined; };
  const h=get('height-cheek'), l=get('lower-cheek'), u=get('upper-cheek');
  if (h === undefined || l === undefined || u === undefined || ![h,l,u].every(Number.isFinite)) return unavailable('Required contour proportions are unavailable. Retake a clearer, forward-facing photo.');
  const t=thresholds, suggestions: Array<{label: FaceShape; rationale:string[]}> = [];
  const values=`Visible height/cheek span ${h.toFixed(2)}, lower/cheek span ${l.toFixed(2)}, upper/cheek span ${u.toFixed(2)}.`;
  const add=(label: FaceShape, reason:string)=>suggestions.push({label,rationale:[reason,values]});
  if(h<=t.shortMax && l>=t.roundLowerMin && l<t.broadLowerMin && Math.abs(u-l)<=t.balancedDifferenceMax) add('round','The contour is relatively short with similar upper and lower spans in this rule set.');
  if(h<=t.shortMax && l>=t.broadLowerMin && Math.abs(u-l)<=t.balancedDifferenceMax) add('square','The lower contour span is relatively broad and the visible contour relatively short; this does not describe jaw bones or angularity.');
  if(h>=t.ovalMin && h<=t.ovalMax && l<t.broadLowerMin && u>t.narrowUpperMax && Math.abs(u-l)<=t.balancedDifferenceMax) add('oval','The visible height is in the provisional intermediate range, with a narrower lower contour and a relatively broad upper contour.');
  if(h>=t.longMin && Math.abs(u-l)<=t.balancedDifferenceMax) add('oblong','Visible height is relatively long compared with the selected cheek-contour span.');
  if(u>=t.broadUpperMin && l<=t.narrowLowerMax && u-l>=t.upperLowerDifference) add('heart','The selected upper contour is broader than the lower contour. Hairline shape is not measured.');
  if(u<=t.narrowUpperMax && l<=t.narrowLowerMax && Math.abs(u-l)<=t.balancedDifferenceMax) add('diamond','The selected cheek contour is broader than both selected upper and lower contour spans.');
  if(l>=t.broadLowerMin && l-u>=t.upperLowerDifference) add('triangular','The selected lower contour is broader than the selected upper contour.');
  const label: FaceShape=suggestions.length===0?'uncertain':suggestions.length===1?suggestions[0].label:'mixed';
  return {status:'ready',value:{label,provenance:'styling-interpretation',method:SHAPE_METHOD,suggestions,thresholds:{...t},rationale:suggestions.length?[...suggestions.flatMap(s=>[`${s.label}: ${s.rationale[0]}`]),values,'These overlapping rules are provisional styling descriptions, not model predictions or validated probabilities.']:['No configured rule fits these available proportions clearly.',values,'A mixed or uncertain description is a valid result; there is no ideal category.']}};
}
