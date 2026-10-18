import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { FaceLandmarker } from '@mediapipe/tasks-vision';
import type { FaceAnalysis, LandmarkFrame, Measurement, QualityCheck, VisibilityAssessment } from '../src/contracts.ts';
import { calculateGeometry, chordAngle, formatMeasurement } from '../src/modules/geometry.ts';
import { MODEL_METHOD } from '../src/modules/detectionTypes.ts';
import { SPANS, JAW_CHORD, GEOMETRY_METHOD } from '../src/modules/landmarkSelections.ts';
import { FACE_OVAL, FACE_TRIANGLES } from '../src/modules/landmarkTopology.ts';
import { estimateShape, SHAPE_THRESHOLDS } from '../src/modules/shapeRules.ts';
const clear: VisibilityAssessment={reviewed:true,obstructed:[],source:'user-reported'};
const checks: QualityCheck[]=['size','framing','pose','blur'].map(id=>({id,label:id,outcome:{status:'ready',value:'pass'},explanation:'Synthetic test fixture',provenance:'capture-metadata',method:{name:'Test fixture',version:'test',sources:[]}}));
// These synthetic coordinates are developer fixtures only, never application sample output.
function frame():LandmarkFrame {
  const width=500,height=1000;
  const landmarks=Array.from({length:478},(_,index)=>({index,x:.5,y:.4,z:0}));
  for(const [index,x,y] of [[10,250,100],[152,250,700],[234,50,350],[454,450,350],[172,90,600],[397,410,600],[54,90,200],[284,410,200],[2,250,450],[133,200,300],[362,300,300],[132,70,500]]) landmarks[index]={index,x:x/width,y:y/height,z:0};
  return {photoId:'synthetic-only',provenance:'model-output',model:MODEL_METHOD,transform:{original:{width,height},prepared:{width,height},rotationDegrees:0,crop:null,mirrored:false,scale:{x:1,y:1}},coordinateSpace:'normalized-prepared-image',landmarks,detectedFaceCount:1,confidence:{status:'unavailable',reason:{code:'insufficient-data',message:'Not supplied'}}};
}
function report(f=frame(),visibility=clear,quality=checks):FaceAnalysis {const result=calculateGeometry(f,quality,visibility);assert.equal(result.status,'ready');if(result.status!=='ready')throw Error();return result.value;}
function measures(r:FaceAnalysis) {assert.equal(r.measurements.status,'ready');return r.measurements.status==='ready'?r.measurements.value:[];}
function value(r:FaceAnalysis,id:string){const m=measures(r).find(m=>m.id===id)!;assert.equal(m.value.status,'ready',id);return m.value.status==='ready'?m.value.value:NaN;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('rectangular-image pixel geometry yields known ratios, not square-normalized distances',()=>{
  const r=report();close(value(r,'height-cheek'),600/400);close(value(r,'lower-cheek'),320/400);close(value(r,'upper-cheek'),320/400);close(value(r,'lower-height'),250/600);close(value(r,'eye-spacing'),100/400);
  const m=measures(r)[0];assert.equal(m.trace?.coordinateSystem,'prepared-image-pixels');assert.equal(m.trace?.spans[0].lengthPx,600);assert.equal(m.trace?.endpoints.find(p=>p.index===10)?.x,250);assert.equal(formatMeasurement(m),'1.50 : 1');
});
test('rigid in-plane rotation and uniform scaling preserve ratios and chord angle',()=>{
  const original=report(), f=frame(), theta=15*Math.PI/180;
  f.landmarks=f.landmarks.map(p=>{const x=p.x*500-250,y=p.y*1000-400;return{...p,x:(250+x*Math.cos(theta)-y*Math.sin(theta))/500,y:(400+x*Math.sin(theta)+y*Math.cos(theta))/1000};});
  const rotated=report(f);for(const m of measures(original))if(m.value.status==='ready')close(value(rotated,m.id),m.value.value);
  const scaled=frame();scaled.transform.prepared={width:1000,height:2000};for(const m of measures(original))if(m.value.status==='ready')close(value(report(scaled),m.id),m.value.value);
});
test('geometry is pure and index-based even if input landmarks are reordered',()=>{
  const f=frame(),before=structuredClone(f);const r=report(f);assert.deepEqual(f,before);f.landmarks.reverse();close(value(report(f),'height-cheek'),value(r,'height-cheek'));assert.equal(r.photoId,f.photoId);assert.equal(r.landmarks.status,'ready');
});
test('missing, duplicate, nonfinite and degenerate endpoints remain unavailable; independent ratios survive',()=>{
  for(const kind of ['missing','duplicate','nan','same']){const f=frame();if(kind==='missing')f.landmarks=f.landmarks.filter(p=>p.index!==234);if(kind==='duplicate')f.landmarks.push({...f.landmarks[234]});if(kind==='nan')f.landmarks[234].x=NaN;if(kind==='same')f.landmarks[234]={...f.landmarks[454],index:234};const r=report(f);assert.equal(measures(r).find(m=>m.id==='height-cheek')?.value.status,'unavailable');close(value(r,'lower-height'),250/600);assert.notEqual(r.approximateShape.status,'ready');}
  for(const width of [0,500.5,NaN]){const f=frame();f.transform.prepared.width=width;assert.ok(measures(report(f)).every(m=>m.value.status==='unavailable'));}
  const outside=frame();outside.landmarks[133].x=1.1;assert.equal(measures(report(outside)).find(m=>m.id==='eye-spacing')?.value.status,'unavailable');
});
test('visibility is explicit; user obstruction suppresses dependent measurements, shape and mesh',()=>{
  const r=report(frame(),{reviewed:false,obstructed:[],source:'user-reported'});assert.equal(measures(r)[0].visibility?.status,'unassessed');close(value(r,'height-cheek'),1.5);assert.equal(measures(r).find(m=>m.id==='contour-angle')?.value.status,'unavailable');assert.equal(r.approximateShape.status,'unavailable');
  const blocked=report(frame(),{...clear,obstructed:['lower']});assert.equal(measures(blocked).find(m=>m.id==='height-cheek')?.value.status,'unavailable');close(value(blocked,'upper-cheek'),.8);close(value(blocked,'eye-spacing'),.25);assert.equal(blocked.estimatedMesh.status,'unavailable');assert.equal(blocked.approximateShape.status,'unavailable');
});
test('quality fail/missing checks block values; wrong model/multiple faces are rejected',()=>{
  const fail=structuredClone(checks);fail[2].outcome={status:'ready',value:'fail'};assert.ok(measures(report(frame(),clear,fail)).every(m=>m.value.status==='unavailable'));assert.ok(measures(report(frame(),clear,[])).every(m=>m.value.status==='unavailable'));
  const f=frame();f.model={...f.model,version:'unverified'};assert.equal(calculateGeometry(f,checks).status,'unavailable');const group=frame();group.detectedFaceCount=2;assert.equal(calculateGeometry(group,checks).status,'unavailable');
});
test('angle method has known 90-degree result and rejects collinear/coincident chords',()=>{
  const p=(x:number,y:number)=>({index:0,x,y});const angle=chordAngle(p(1,0),p(0,0),p(0,1),1e-6);assert.deepEqual(angle,{status:'ready',value:90});assert.equal(chordAngle(p(0,0),p(0,0),p(1,0),1e-6).status,'unavailable');assert.equal(chordAngle(p(-1,0),p(0,0),p(1,0),1e-6).status,'unavailable');
});
test('mesh uses actual xyz with width-scaled z and a uniform image-plane scale; bad z preserves 2D',()=>{
  const f=frame();f.landmarks[0].z=-.1;const r=report(f);assert.equal(r.estimatedMesh.status,'ready');if(r.estimatedMesh.status==='ready'){assert.equal(r.estimatedMesh.value.vertices.length,478);close(r.estimatedMesh.value.vertices[0].z,(50-50/478)/600);assert.deepEqual(r.estimatedMesh.value.triangles[0],[127,34,139]);}
  f.landmarks[0].z=NaN;const noMesh=report(f);assert.equal(noMesh.estimatedMesh.status,'unavailable');close(value(noMesh,'height-cheek'),1.5);
});
test('pinned topology and named endpoint indices match official runtime and canonical index reference',()=>{
  assert.deepEqual(FACE_OVAL,FaceLandmarker.FACE_LANDMARKS_FACE_OVAL);
  assert.deepEqual(FACE_TRIANGLES.flatMap(([a,b,c])=>[{start:a,end:b},{start:b,end:c},{start:c,end:a}]),FaceLandmarker.FACE_LANDMARKS_TESSELATION);
  const oval=new Set(FACE_OVAL.flatMap(edge=>[edge.start,edge.end]));for(const id of ['height','cheek','lower','upper'] as const){assert.ok(oval.has(SPANS[id].from));assert.ok(oval.has(SPANS[id].to));}assert.ok(JAW_CHORD.indices.every(i=>oval.has(i)));
  assert.ok(FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE.some(edge=>[edge.start,edge.end].includes(133)));assert.ok(FaceLandmarker.FACE_LANDMARKS_LEFT_EYE.some(edge=>[edge.start,edge.end].includes(362)));
  const bytes=readFileSync(new URL('./reference/canonical_face_model.obj',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),'8bac80443397e113f41a8b565ea72c59390bc031d9defab289dba7bc0c54e618');const vertices=bytes.toString().split(/\r?\n/).filter(line=>line.startsWith('v ')).map(line=>line.split(/\s+/).slice(1).map(Number));assert.equal(vertices.length,468);assert.equal(vertices[2][0],0);assert.ok(vertices[2][1]>vertices[152][1]);for(const [a,b] of [[234,454],[172,397],[54,284],[133,362]]){close(vertices[a][0],-vertices[b][0]);close(vertices[a][1],vertices[b][1]);}
});
function shapeMeasurements(h:number,l:number,u:number):Measurement[]{return [['height-cheek',h],['lower-cheek',l],['upper-cheek',u]].map(([id,n])=>({id:String(id),label:String(id),provenance:'calculated-geometry',value:{status:'ready',value:Number(n)},unit:'ratio',landmarkIndices:[],method:GEOMETRY_METHOD,limitations:[]}));}
test('seven provisional shape descriptions plus mixed/uncertain, without forced categories or probabilities',()=>{
  for(const [expected,h,l,u] of [['oval',1.4,.8,.86],['round',1.1,.8,.85],['square',1.2,.9,.9],['oblong',1.6,.8,.86],['heart',1.4,.66,.95],['diamond',1.4,.65,.75],['triangular',1.4,.95,.75],['mixed',1.25,.8,.86],['uncertain',1.4,.9,.85]] as const){const r=estimateShape(shapeMeasurements(h,l,u),clear);assert.equal(r.status,'ready');if(r.status==='ready'){assert.equal(r.value.label,expected);assert.equal(r.value.provenance,'styling-interpretation');assert.ok(r.value.rationale.length);assert.equal('probability' in r.value,false);}}
});
test('shape thresholds are configurable and retained; invalid configuration is unavailable',()=>{
  const r=estimateShape(shapeMeasurements(1.25,.8,.86),clear,{...SHAPE_THRESHOLDS,shortMax:1.2});assert.equal(r.status,'ready');if(r.status==='ready'){assert.equal(r.value.label,'oval');assert.equal(r.value.thresholds?.shortMax,1.2);}assert.equal(estimateShape(shapeMeasurements(1.2,.8,.8),clear,{...SHAPE_THRESHOLDS,longMin:NaN}).status,'unavailable');
});
