import type {FaceAnalysis,Measurement} from '../contracts.ts';

const wording:Record<string,{label:string;sentence:(v:string)=>string}>={
 'height-cheek':{label:'Face height compared with width',sentence:v=>`The visible face height is ${v} times the width across the cheek contour.`},
 'lower-cheek':{label:'Lower-face width',sentence:v=>`The lower-face contour is ${v} times the cheek-contour width.`},
 'upper-cheek':{label:'Upper-face width',sentence:v=>`The upper-face contour is ${v} times the cheek-contour width. This does not locate your hairline.`},
 'lower-height':{label:'Nose-to-chin length',sentence:v=>`The nose-to-chin span is ${v} times the visible face height.`},
 'eye-spacing':{label:'Space between the eyes',sentence:v=>`The inner-eye gap is ${v} times the cheek-contour width.`},
 'contour-angle':{label:'Visible jaw-contour angle',sentence:v=>`The selected two-dimensional contour chords form an angle of ${v} degrees. This is not a jaw-bone measurement.`},
};
export function readableMeasurement(m:Measurement){
 const copy=wording[m.id];
 return {label:copy?.label??m.label,text:m.value.status==='ready'&&Number.isFinite(m.value.value)?copy?.sentence(m.value.value.toFixed(m.unit==='degrees'?0:2))??m.explanation??m.label:m.value.status==='unavailable'?m.value.reason.message:'This measurement is unavailable.'};
}
export function reportTakeaways(analysis:FaceAnalysis):string[]{
 const shape=analysis.approximateShape;
 const lines=[shape.status==='ready'?`Approximate face-shape description: ${shape.value.label}. Use this as optional styling guidance.`:!analysis.visibility?.reviewed?'Face shape is waiting for your visibility review. In Report, confirm which facial contours are visible; the app will then reassess it.':shape.status==='unavailable'?shape.reason.message:'A face-shape description is unavailable.'];
 if(analysis.measurements.status==='ready')for(const id of ['height-cheek','lower-cheek']){const m=analysis.measurements.value.find(m=>m.id===id);if(m?.value.status==='ready'&&Number.isFinite(m.value.value))lines.push(readableMeasurement(m).text);}
 if(!analysis.visibility?.reviewed)lines.push('The ratios are provisional because visibility has not been reviewed. Hair, glasses or facial hair may hide the true visible contour.');
 return lines;
}
