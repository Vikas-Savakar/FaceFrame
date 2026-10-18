import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {FaceAnalysis,LandmarkFrame,PhotoAsset} from '../src/contracts.ts';
import {defaultReportStyles,renderReport,structureDrawing} from '../src/modules/reportRendering.ts';
import {resolveAssetPath} from '../src/modules/assets.ts';
import {LocalDownloads,renderStructureImage,structureImageLayout} from '../src/modules/structureExport.ts';
import {referencePreview} from '../src/modules/referencePreview.ts';
import {reportTakeaways,readableMeasurement,readableStyleReason} from '../src/modules/reportSummary.ts';
import {HAIRSTYLES} from '../src/modules/hairstyleCatalog.ts';
// Known developer geometry only; never imported into the production application.
function fixture():FaceAnalysis{
 const landmarks=Array.from({length:478},(_,index)=>({index,x:.5,y:.5,z:0}));landmarks[10]={index:10,x:.5,y:.1,z:0};landmarks[152]={index:152,x:.5,y:.9,z:0};landmarks[234]={index:234,x:.2,y:.5,z:0};landmarks[454]={index:454,x:.8,y:.5,z:0};
 const frame:LandmarkFrame={photoId:'synthetic',provenance:'model-output',model:{name:'Fixture',version:'test',sources:[]},coordinateSpace:'normalized-prepared-image',transform:{original:{width:400,height:800},prepared:{width:400,height:800},crop:null,rotationDegrees:0,mirrored:false,scale:{x:1,y:1}},landmarks,detectedFaceCount:1,confidence:{status:'empty'}};
 return{photoId:'synthetic',schemaVersion:'1.0.0',landmarks:{status:'ready',value:frame},qualityChecks:[],approximateShape:{status:'unavailable',reason:{code:'visibility-unassessed',message:'Synthetic visibility unassessed'}},estimatedMesh:{status:'empty'},measurements:{status:'ready',value:[{id:'height-cheek',label:'Height / cheek',value:{status:'ready',value:640/240},unit:'ratio',provenance:'calculated-geometry',landmarkIndices:[10,152,234,454],method:{name:'Fixture',version:'test',sources:[]},limitations:[],trace:{coordinateSystem:'prepared-image-pixels',endpoints:[],spans:[{id:'height',label:'Height',from:10,to:152,lengthPx:640},{id:'cheek',label:'Cheek',from:234,to:454,lengthPx:240}]}}]},limitations:['Synthetic fixture only']};
}
const options={photoId:'synthetic',photoPreparedAt:'2026-10-18T00:00:00Z',generatedAt:'2026-10-18T01:00:00Z',selectedIds:[HAIRSTYLES[0].id],catalog:HAIRSTYLES,care:{concern:'general' as const,jawline:false}};

test('tall PNG layout stays bounded, uniformly scaled and centered with readable footer width',()=>{
 const tall=structureImageLayout(160,1280);assert.equal(tall.outputWidth,800);assert.equal(tall.imageHeight,2048);assert.equal(tall.scale,1.6);assert.equal(tall.offsetX,272);
 const landscape=structureImageLayout(1280,720);assert.deepEqual(landscape,{outputWidth:1280,imageHeight:720,scale:1,offsetX:0});
 const ordinary=structureImageLayout(420,580);assert.equal(ordinary.imageHeight,1105);assert.equal(ordinary.offsetX,0);
 for(const [w,h]of [[0,100],[100,NaN],[-1,5]])assert.throws(()=>structureImageLayout(w,h));
});
test('gallery derivatives are same-origin paths; original catalog and export sources remain unchanged',()=>{
 for(const s of HAIRSTYLES){assert.equal(s.referenceImage.status,'ready');if(s.referenceImage.status!=='ready')continue;const url=s.referenceImage.value.url;assert.match(referencePreview(url),/^\/hairstyles\/previews\/[a-z-]+\.webp$/);assert.match(url,/\.png$/);}
 assert.equal(referencePreview('https://example.com/image.png'),'https://example.com/image.png');
});
test('final report defaults to excluding pixels, uses current analysis and retains complete reference rights',()=>{const analysis=fixture(),before=structuredClone(analysis),r=renderReport(analysis,options);assert.equal(r.status,'ready');if(r.status==='ready'){assert.equal(r.value.includePhoto,false);assert.equal(r.value.analysis,analysis);assert.equal(r.value.selectedStyles.length,1);assert.deepEqual(r.value.selectedStyles[0].style.referenceImage,HAIRSTYLES[0].referenceImage);assert.equal(r.value.generatedAt,options.generatedAt);}assert.deepEqual(analysis,before);const yes=renderReport(analysis,{...options,includePhoto:true});assert.ok(yes.status==='ready'&&yes.value.includePhoto);});
test('mismatched photo/frame IDs and invalid dates cannot create a report',()=>{assert.equal(renderReport(fixture(),{...options,photoId:'B'}).status,'unavailable');const f=fixture();if(f.landmarks.status==='ready')f.landmarks.value.photoId='A';assert.equal(renderReport(f,options).status,'unavailable');assert.equal(renderReport(fixture(),{...options,generatedAt:'invalid'}).status,'unavailable');});
test('photo-free outline uses actual image pixels in a rectangular frame and withholds unavailable spans',()=>{const a=fixture(),d=structureDrawing(a);assert.deepEqual(d.points.get(10),{index:10,x:200,y:80});assert.deepEqual(d.points.get(152),{index:152,x:200,y:720});assert.equal(d.width,400);assert.equal(d.height,800);assert.equal(d.spans[0].lengthPx,640);assert.ok(!('blob'in d));if(a.measurements.status==='ready')a.measurements.value[0].value={status:'unavailable',reason:{code:'obstructed',message:'Test obstruction'}};assert.equal(structureDrawing(a).spans.length,0);});
test('public image/source paths respect root and nested deployment without rewriting external sources',()=>{assert.equal(resolveAssetPath('/hairstyles/a.png','/faceframe/'),'/faceframe/hairstyles/a.png');assert.equal(resolveAssetPath('/hairstyles/a.png','/'),'/hairstyles/a.png');assert.equal(resolveAssetPath('https://www.aad.org/source','/faceframe/'),'https://www.aad.org/source');assert.throws(()=>resolveAssetPath('/a','../'));});
test('PNG rendering never decodes or draws a photo when omitted, even after a photo export; abort clears resources',async()=>{
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldBitmap=globalThis.createImageBitmap;
 let decodeCount=0,drawCount=0,closeCount=0;const canvases:Array<{width:number;height:number}>=[];
 const context=new Proxy({drawImage(){drawCount++;}}, {get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){const c={width:0,height:0,getContext:()=>context,toBlob:(callback:(b:Blob)=>void)=>callback(new Blob(['controlled encoder test']))};canvases.push(c);return c;}}});
 globalThis.createImageBitmap=(async()=>{decodeCount++;return{close(){closeCount++;}};}) as typeof createImageBitmap;
 const a=fixture(),photo={id:'synthetic',blob:new Blob(['controlled test pixels'])} as PhotoAsset;
 try{await renderStructureImage(a);assert.equal(decodeCount,0);assert.equal(drawCount,0);await renderStructureImage(a,photo);assert.equal(drawCount,1);assert.equal(closeCount,1);await renderStructureImage(a);assert.equal(decodeCount,1);assert.equal(drawCount,1);assert.equal(canvases.length,3);assert.ok(canvases.every(c=>c.width===0&&c.height===0));
 const controller=new AbortController();globalThis.createImageBitmap=(async()=>{controller.abort();return{close(){closeCount++;}};}) as typeof createImageBitmap;await assert.rejects(renderStructureImage(a,photo,controller.signal),{name:'AbortError'});assert.equal(closeCount,2);assert.ok(canvases.every(c=>c.width===0&&c.height===0));
 }finally{if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');globalThis.createImageBitmap=oldBitmap;}
});
test('download reset revokes outstanding Blob handles and removes temporary links',()=>{const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),create=URL.createObjectURL,revoke=URL.revokeObjectURL;let created=0,revoked=0,removed=0;Object.defineProperty(globalThis,'document',{configurable:true,value:{body:{append(){}},createElement(){return{click(){},remove(){removed++;}};}}});URL.createObjectURL=()=>{created++;return'blob:controlled-'+created;};URL.revokeObjectURL=()=>{revoked++;};try{const downloads=new LocalDownloads();downloads.save(new Blob(['fixture']),'test.png');downloads.save(new Blob(['fixture']),'test.png');assert.equal(created,2);assert.equal(removed,2);downloads.dispose();assert.equal(revoked,2);downloads.dispose();assert.equal(revoked,2);}finally{URL.createObjectURL=create;URL.revokeObjectURL=revoke;if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');}});

test('abort clears export canvas before a pending encoder callback returns',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'document');let complete:(b:Blob)=>void=()=>{};
 const context=new Proxy({}, {get:()=>()=>{}}),canvas={width:0,height:0,getContext:()=>context,toBlob:(callback:(b:Blob)=>void)=>{complete=callback;}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>canvas}});
 const controller=new AbortController(),pending=renderStructureImage(fixture(),undefined,controller.signal),rejection=assert.rejects(pending,{name:'AbortError'});
 try{controller.abort();await Promise.resolve();await Promise.resolve();assert.equal(canvas.width,0,'Reset must clear the canvas without waiting for encoding');}
 finally{complete(new Blob(['late controlled encoder result']));await rejection;if(original)Object.defineProperty(globalThis,'document',original);else Reflect.deleteProperty(globalThis,'document');}
});

test('report auto-selection excludes favourites outside current presentation preferences',()=>{
 const a=fixture();a.styling={preferences:{presentation:'masculine',texture:'any',currentLength:'any',desiredLength:'any',stylingTime:'any',preferredStyles:[],facialHair:'unknown',allowGrowOut:false,useGeometry:false},recommendations:[],catalogVersion:'4.0.0',imageCredits:[]};
 assert.deepEqual(defaultReportStyles(a,['straight-bob','wavy-lob'],HAIRSTYLES),[]);
 assert.deepEqual(defaultReportStyles(a,['straight-bob','textured-crop','textured-crop'],HAIRSTYLES),['textured-crop']);
 const regular=renderReport(a,options),detailed=renderReport(a,{...options,includeTechnicalDetails:true});
 assert.ok(regular.status==='ready'&&!regular.value.includeTechnicalDetails&&!regular.value.includePhoto);
 assert.ok(detailed.status==='ready'&&detailed.value.includeTechnicalDetails&&!detailed.value.includePhoto);
});

test('plain-language report uses actual values and never fills missing or obstructed measurements',()=>{
 const a=fixture();const copy=reportTakeaways(a).join(' ');assert.match(copy,/2.67 times/);assert.match(copy,/visibility review/);assert.doesNotMatch(copy,/perfect|ideal ratio/);
 if(a.measurements.status==='ready'){const m=a.measurements.value[0];m.value={status:'unavailable',reason:{code:'obstructed',message:'Hidden by hair'}};assert.equal(readableMeasurement(m).text,'Hidden by hair');assert.doesNotMatch(reportTakeaways(a).join(' '),/2.67/);}
 assert.match(reportTakeaways({...a,measurements:{status:'empty'}}).join(' '),/visibility review/);
});

test('unselected reference group cannot auto-add mixed favourites to a report',()=>{
 const a=fixture();assert.deepEqual(defaultReportStyles(a,['straight-bob','textured-crop'],HAIRSTYLES),[]);
 a.styling={preferences:{presentation:'unset',texture:'any',currentLength:'any',desiredLength:'any',stylingTime:'any',preferredStyles:[],facialHair:'unknown',allowGrowOut:false,useGeometry:false},recommendations:[],catalogVersion:'4.1.0',imageCredits:[]};
 assert.deepEqual(defaultReportStyles(a,['straight-bob','textured-crop'],HAIRSTYLES),[]);
});

test('readable reference reasons remove repeated metadata but retain grow-out and actual geometry',()=>{
 const reason='Matches your chosen masculine style presentation. Reference texture: straight. short length option. About 5 minutes of daily styling is a planning estimate; your routine may vary. Grow-out option: more length is needed first; this is not an immediate cut. Visible height/cheek span 1.18: top volume offers an optional vertical styling line.';
 const copy=readableStyleReason(reason);assert.doesNotMatch(copy,/Reference texture|length option|About 5 minutes/);assert.match(copy,/chosen masculine/);assert.match(copy,/Grow-out option/);assert.match(copy,/1.18/);
 const manual='Selected from the reference gallery. This selection may fall outside the current recommendation preferences.';assert.equal(readableStyleReason(manual),manual);
});
