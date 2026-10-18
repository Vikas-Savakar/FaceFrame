import type { FaceAnalysis, LandmarkFrame, Measurement, QualityCheck, Result, VisibilityAssessment, VisibilityRegion } from '../contracts';
import { MODEL_METHOD } from './detectionTypes.ts';
import { SPANS, JAW_CHORD, GEOMETRY_METHOD } from './landmarkSelections.ts';
import type { SpanId } from './landmarkSelections.ts';
import { FACE_TRIANGLES } from './landmarkTopology.ts';
import { estimateShape, SHAPE_THRESHOLDS, SHAPE_METHOD } from './shapeRules.ts';
import type { ShapeThresholds } from './shapeRules.ts';
export const UNASSESSED_VISIBILITY: VisibilityAssessment = { reviewed: false, obstructed: [], source: 'user-reported' };
export const REPORT_LIMITATIONS = [
  'A single photograph supports apparent image-plane proportions and estimated geometry, not exact depth, hidden anatomy or physical millimetres.',
  'Camera distance, perspective, pose, expression, facial hair, filters and lighting can change the visible contours and proportions.',
  'Upper-face and cheek spans are visible model-contour estimates. They do not locate a hidden hairline or measure underlying cheekbones.',
  'Automatic obstruction detection is not implemented. Even user-confirmed visibility and capture-quality checks can be mistaken.',
  'The shape descriptions are provisional, overlapping styling heuristics. They do not grade appearance or describe a perfect or ideal face.',
  'Rotating the estimated landmark mesh does not reveal accurately observed side, back or hidden facial surfaces.',
];
type Point = { index: number; x: number; y: number };
type Span = { id: SpanId; label: string; from: number; to: number; lengthPx: number };
const missing = <T,>(message: string, code: 'insufficient-data' | 'degenerate' | 'poor-quality' | 'obstructed' | 'visibility-unassessed' = 'insufficient-data'): Result<T> => ({ status: 'unavailable', reason: { code, message } });
/** Conversion is mandatory before any length/angle. Pure; never alters the landmark input. */
export function toImagePoint(point: LandmarkFrame['landmarks'][number], width: number, height: number): Point | undefined {
  if (![width,height,point.x,point.y].every(Number.isFinite) || width <= 0 || height <= 0 || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return undefined;
  return { index: point.index, x: point.x * width, y: point.y * height };
}
export const distance2D = (a: {x:number;y:number}, b: {x:number;y:number}) => Math.hypot(a.x-b.x,a.y-b.y);
export function chordAngle(a: Point, vertex: Point, b: Point, epsilon: number): Result<number> {
  const u={x:a.x-vertex.x,y:a.y-vertex.y}, v={x:b.x-vertex.x,y:b.y-vertex.y};
  const lu=Math.hypot(u.x,u.y), lv=Math.hypot(v.x,v.y);
  if(lu<=epsilon||lv<=epsilon) return missing('An angle endpoint coincides with its vertex.','degenerate');
  const angle=Math.acos(Math.max(-1,Math.min(1,(u.x*v.x+u.y*v.y)/(lu*lv))))*180/Math.PI;
  return angle<5||angle>175 ? missing('The selected contour chords are nearly collinear; an apparent contour bend is not defensible.','degenerate') : {status:'ready',value:angle};
}
export function formatMeasurement(measurement: Measurement) {
  return measurement.value.status==='ready' ? (measurement.unit==='degrees' ? `${Math.round(measurement.value.value)}°` : `${measurement.value.value.toFixed(2)} : 1`) : 'Unavailable';
}
export function calculateGeometry(frame: LandmarkFrame, checks: QualityCheck[] = [], visibility: VisibilityAssessment = UNASSESSED_VISIBILITY, thresholds: ShapeThresholds = SHAPE_THRESHOLDS): Result<FaceAnalysis> {
  if(frame.model.version!==MODEL_METHOD.version || frame.coordinateSpace!=='normalized-prepared-image') return {status:'unavailable',reason:{code:'unsupported',message:'The landmark index selections are verified only for the pinned MediaPipe model/runtime and prepared-image coordinate space.'}};
  if(frame.detectedFaceCount!==1) return missing('Retake a photo with exactly one detected face.','poor-quality');
  const {width,height}=frame.transform.prepared;
  const dimensionsOK=Number.isFinite(width)&&Number.isFinite(height)&&Number.isInteger(width)&&Number.isInteger(height)&&width>0&&height>0;
  const epsilon=dimensionsOK?Math.max(width,height)*1e-6:1;
  const qualityOK=['size','framing','pose','blur'].every(id=>checks.some(c=>c.id===id&&c.outcome.status==='ready'&&c.outcome.value!=='fail')) && !checks.some(c=>c.outcome.status==='ready'&&c.outcome.value==='fail');
  const points=new Map<number,Point>(), seen=new Set<number>();
  for(const landmark of frame.landmarks){if(seen.has(landmark.index)){points.delete(landmark.index);continue;}seen.add(landmark.index);const p=toImagePoint(landmark,width,height);if(p)points.set(p.index,p);}
  const visible=(regions:VisibilityRegion[]): NonNullable<Measurement['visibility']> => {
    const affected=regions.filter(region=>visibility.obstructed.includes(region));
    return affected.length ? {status:'obstructed',reason:`User-reported obstruction affects: ${affected.join(', ')}.`} : visibility.reviewed ? {status:'clear',reason:'User reports the relevant regions are visible; the detector has not verified this.'} : {status:'unassessed',reason:'Visibility has not been assessed. These spans may cross obscured or model-inferred boundaries.'};
  };
  const span=(id:SpanId): Result<Span>=>{
    const def=SPANS[id], a=points.get(def.from), b=points.get(def.to);
    if(!dimensionsOK) return missing('Prepared image dimensions are invalid.');
    if(!a||!b) return missing(`Missing, duplicate, non-finite or out-of-frame endpoint: ${def.from} / ${def.to}.`);
    const lengthPx=distance2D(a,b);
    return lengthPx<=epsilon ? missing(`The ${def.label.toLowerCase()} endpoints coincide or are too close.`,'degenerate') : {status:'ready',value:{id,label:def.label,from:def.from,to:def.to,lengthPx}};
  };
  const ratio=(id:string,label:string,numerator:SpanId,denominator:SpanId,explanation:string):Measurement=>{
    const n=span(numerator), d=span(denominator), defs=[SPANS[numerator],SPANS[denominator]];
    const indices=[...new Set(defs.flatMap(def=>[def.from,def.to]))];
    const vis=visible([...new Set(defs.flatMap(def=>def.regions))]);
    let value:Result<number>;
    if(!qualityOK) value=missing('Capture quality is unassessed or unsuitable. Retake a clear forward-facing photo.','poor-quality');
    else if(vis.status==='obstructed') value=missing(vis.reason,'obstructed');
    else if(n.status!=='ready') value=n;
    else if(d.status!=='ready') value=d;
    else value={status:'ready',value:n.value.lengthPx/d.value.lengthPx};
    return {id,label,provenance:'calculated-geometry',value,unit:'ratio',landmarkIndices:indices,method:{...GEOMETRY_METHOD,name:`${GEOMETRY_METHOD.name}: ${label}`},explanation,formula:`distance(${defs[0].from}, ${defs[0].to}) / distance(${defs[1].from}, ${defs[1].to}); distance in prepared-image pixels`,visibility:vis,limitations:[vis.reason,'Straight image-plane chord lengths; not anatomical lengths or ideal targets.'],trace:{coordinateSystem:'prepared-image-pixels',endpoints:indices.flatMap(i=>points.has(i)?[points.get(i)!]:[]),spans:[n,d].flatMap(result=>result.status==='ready'?[result.value]:[])}};
  };
  const measurements:Measurement[]=[
    ratio('height-cheek','Visible height / cheek-contour span','height','cheek','How the top-to-chin visible contour span compares with the selected lateral cheek-contour span.'),
    ratio('lower-cheek','Lower contour / cheek-contour span','lower','cheek','How broad the selected lower-face contour appears relative to the visible cheek-contour span.'),
    ratio('upper-cheek','Upper contour / cheek-contour span','upper','cheek','How broad the selected upper-face contour appears relative to the cheek-contour span. This is not a hairline measurement.'),
    ratio('lower-height','Nose-base–chin / visible height','lowerHeight','height','The nose-base-to-chin chord relative to the top-contour-to-chin chord. This is a defined lower-face surface proxy, not a clinical facial third.'),
    ratio('eye-spacing','Inner eye spacing / cheek-contour span','eyeGap','cheek','The gap between selected inner eye corners relative to the visible cheek-contour span; not pupil distance.'),
  ];
  const jawVisibility=visible(JAW_CHORD.regions), [a,b,c]=JAW_CHORD.indices.map(i=>points.get(i));
  const angle= !dimensionsOK?missing<number>('Prepared image dimensions are invalid.'):!qualityOK?missing<number>('Capture quality is unassessed or unsuitable.','poor-quality'):jawVisibility.status==='obstructed'?missing<number>(jawVisibility.reason,'obstructed'):jawVisibility.status==='unassessed'?missing<number>('Confirm that the side and lower contour are clearly visible before displaying this angle.','visibility-unassessed'): !a||!b||!c?missing<number>('A selected contour-angle endpoint is missing or invalid.'):chordAngle(a,b,c,epsilon);
  measurements.push({id:'contour-angle',label:'Apparent 2D lower-jaw contour chord angle',provenance:'calculated-geometry',unit:'degrees',value:angle,landmarkIndices:[...JAW_CHORD.indices],method:{...GEOMETRY_METHOD,name:'Image-plane angle of chords 172→132 and 172→152'},formula:'acos(dot(P132−P172, P152−P172) / (length(P132−P172) × length(P152−P172))) in degrees',explanation:'The included image-plane angle at selected contour point 172. It describes two chosen surface chords, not a clinical jaw-bone or gonial angle.',visibility:jawVisibility,limitations:[jawVisibility.reason,'Only shown with user-confirmed visibility and nondegenerate chords; chord selection, pose, facial hair and perspective affect this value.'],trace:{coordinateSystem:'prepared-image-pixels',endpoints:[a,b,c].filter((p):p is Point=>!!p),spans:[]}});
  let mesh:FaceAnalysis['estimatedMesh']=missing('Some model coordinates are unavailable. The 2D report can still be used.');
  if(!qualityOK) mesh=missing('Retake a clearer photo before using the estimated mesh.','poor-quality');
  else if(visibility.obstructed.length) mesh=missing('A region is reported obscured. The estimated mesh is withheld because hidden surfaces may be inferred.','obstructed');
  else if(dimensionsOK&&points.size===478&&frame.landmarks.length===478&&frame.landmarks.every(p=>Number.isFinite(p.z))) {
    const ordered=[...frame.landmarks].sort((l,r)=>l.index-r.index);
    if(ordered.every((p,i)=>p.index===i)) {
      const xs=ordered.map(p=>p.x*width), ys=ordered.map(p=>p.y*height), zs=ordered.map(p=>p.z*width);
      const cx=(Math.min(...xs)+Math.max(...xs))/2, cy=(Math.min(...ys)+Math.max(...ys))/2, cz=zs.reduce((sum,z)=>sum+z,0)/zs.length;
      const scale=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
      if(scale>epsilon) mesh={status:'ready',value:{provenance:'calculated-geometry',method:{...GEOMETRY_METHOD,name:'Visual mesh: centered (x×W, −y×H, −z×W), one uniform scale; official topology'},vertices:ordered.map((_,i)=>({x:(xs[i]-cx)/scale,y:-(ys[i]-cy)/scale,z:-(zs[i]-cz)/scale})),triangles:FACE_TRIANGLES.map(t=>[...t])}};
    }
  }
  return {status:'ready',value:{photoId:frame.photoId,schemaVersion:'1.0.0',landmarks:{status:'ready',value:frame},qualityChecks:checks,measurements:{status:'ready',value:measurements},approximateShape:estimateShape(measurements,visibility,thresholds),estimatedMesh:mesh,geometryMethod:GEOMETRY_METHOD,shapeRules:{method:SHAPE_METHOD,thresholds:{...thresholds}},visibility:{...visibility,obstructed:[...visibility.obstructed]},limitations:[...REPORT_LIMITATIONS]}};
}
