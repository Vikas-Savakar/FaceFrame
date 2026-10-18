import type {CatalogStyle,FaceAnalysis,FinalReportData,ReportCareChoices,Result} from '../contracts.ts';
import {FACE_OVAL} from './landmarkTopology.ts';
import {rankStyles} from './recommendations.ts';
/** Auto-selection honors current preferences. Out-of-preference favourites require explicit selection. */
export function defaultReportStyles(analysis:FaceAnalysis,favourites:string[],catalog:CatalogStyle[]):string[]{
 const preferences=analysis.styling?.preferences;
 const allowed=new Set((preferences?rankStyles(catalog,preferences,analysis).map(r=>r.style):catalog).map(s=>s.id));
 const saved=[...new Set(favourites)].filter(id=>allowed.has(id)).slice(0,5);
 const recommended=analysis.styling?.recommendations.flatMap(r=>r.content.status==='ready'&&r.content.value.hairstyleId&&allowed.has(r.content.value.hairstyleId)?[r.content.value.hairstyleId]:[])??[];
 return saved.length?saved:recommended.slice(0,3);
}
/** Current analysis only; never runs inference or fabricates a missing measurement. */
export function renderReport(analysis:FaceAnalysis, options:{photoId:string;photoPreparedAt:string;selectedIds:string[];catalog:CatalogStyle[];care:ReportCareChoices;includePhoto?:boolean;includeTechnicalDetails?:boolean;generatedAt?:string}):Result<FinalReportData>{
 if(analysis.photoId!==options.photoId||analysis.landmarks.status!=='ready'||analysis.landmarks.value.photoId!==options.photoId)return{status:'unavailable',reason:{code:'no-photo',message:'The report does not match the current photo.'}};
 const generatedAt=options.generatedAt??new Date().toISOString();
 if(!Number.isFinite(Date.parse(generatedAt))||!Number.isFinite(Date.parse(options.photoPreparedAt)))return{status:'unavailable',reason:{code:'insufficient-data',message:'Report dates are unavailable.'}};
 const selectedStyles=[...new Set(options.selectedIds)].flatMap(id=>{const style=options.catalog.find(s=>s.id===id);if(!style||style.referenceImage.status!=='ready')return[];const rec=analysis.styling?.recommendations.find(r=>r.content.status==='ready'&&r.content.value.hairstyleId===id);return[{style,reason:rec?.content.status==='ready'?rec.content.value.explanation:'Selected from the reference gallery. This selection may fall outside the current recommendation preferences.'}];});
 return{status:'ready',value:{generatedAt,photoPreparedAt:options.photoPreparedAt,analysis,selectedStyles,care:{...options.care},includePhoto:options.includePhoto===true,includeTechnicalDetails:options.includeTechnicalDetails===true,formatVersion:'5.1.0'}};
}
/** Photo-free drawing data. No PhotoAsset, canvas, screenshot or pixel buffer enters here. */
export function structureDrawing(analysis:FaceAnalysis){
 if(analysis.landmarks.status!=='ready')throw new Error('Landmarks are unavailable.');
 const frame=analysis.landmarks.value,{width,height}=frame.transform.prepared;
 if(frame.photoId!==analysis.photoId||!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new Error('Invalid structure coordinates.');
 const points=new Map(frame.landmarks.filter(p=>[p.x,p.y].every(Number.isFinite)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1).map(p=>[p.index,{index:p.index,x:p.x*width,y:p.y*height}]));
 const spans=new Map<string,{id:string;label:string;from:number;to:number;lengthPx:number}>();
 if(analysis.measurements.status==='ready')for(const m of analysis.measurements.value)if(m.value.status==='ready')for(const span of m.trace?.spans??[])if(points.has(span.from)&&points.has(span.to))spans.set(span.id,span);
 const edges=FACE_OVAL.flatMap(e=>points.has(e.start)&&points.has(e.end)?[{a:points.get(e.start)!,b:points.get(e.end)!}]:[]);
 const all=[...points.values()];if(!all.length||!edges.length)throw new Error('The detected outline is unavailable.');
 const left=Math.min(...all.map(p=>p.x)),top=Math.min(...all.map(p=>p.y)),right=Math.max(...all.map(p=>p.x)),bottom=Math.max(...all.map(p=>p.y));
 const padding=Math.max(right-left,bottom-top)*.15;
 return{width,height,points,edges,spans:[...spans.values()],viewBox:[left-padding,top-padding,right-left+padding*2,bottom-top+padding*2],font:Math.max(right-left,bottom-top)*.03};
}
export const SPAN_LETTERS:Record<string,string>={height:'H',cheek:'C',lower:'L',upper:'U',lowerHeight:'N',eyeGap:'E'};
