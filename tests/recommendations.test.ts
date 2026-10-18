import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HAIRSTYLES} from '../src/modules/hairstyleCatalog.ts';
import {DEFAULT_PREFERENCES,geometryContext,rankStyles,recommendStyles,withStyling} from '../src/modules/recommendations.ts';
import {CARE_REVIEW_DATE,CARE_SOURCES} from '../src/modules/careContent.ts';
import type {FaceAnalysis,StylingPreferences} from '../src/contracts.ts';
const prefs=(patch:Partial<StylingPreferences>={}):StylingPreferences=>({...DEFAULT_PREFERENCES,preferredStyles:[],...patch});
function analysis(h=1.6):FaceAnalysis{return{photoId:'synthetic-only',schemaVersion:'1.0.0',landmarks:{status:'empty'},qualityChecks:[],measurements:{status:'ready',value:[{id:'height-cheek',label:'Test',provenance:'calculated-geometry',value:{status:'ready',value:h},unit:'ratio',landmarkIndices:[10,152,234,454],method:{name:'Fixture',version:'test',sources:[]},limitations:[]}]},approximateShape:{status:'ready',value:{label:'oblong',provenance:'styling-interpretation',method:{name:'Fixture',version:'test',sources:[]},rationale:[]}},estimatedMesh:{status:'empty'},visibility:{reviewed:true,obstructed:[],source:'user-reported'},limitations:[]};}
test('24 unique usable references cover each texture and length with full provenance',()=>{
 assert.equal(HAIRSTYLES.length,24);assert.equal(new Set(HAIRSTYLES.map(s=>s.id)).size,24);
 const credits=JSON.parse(readFileSync(new URL('../public/hairstyles/credits.json',import.meta.url),'utf8'));
 for(const texture of ['straight','wavy','curly','coiled'])for(const length of ['short','medium','long'])assert.ok(HAIRSTYLES.some(s=>s.texture===texture&&s.length===length));
 for(const s of HAIRSTYLES){assert.equal(s.referenceImage.status,'ready');if(s.referenceImage.status!=='ready')continue;const i=s.referenceImage.value;assert.ok(i.generated&&i.reviewedAt&&i.generationRecord&&i.alt.includes('Generated'));assert.ok(i.license.attribution&&i.license.url&&i.source.url===i.url&&i.modifications);assert.ok(readFileSync(new URL('../public'+i.url,import.meta.url)).length>1000);assert.deepEqual(credits.records.find((r:{id:string})=>r.id===s.id).image,i);assert.ok(s.stylistBrief&&s.requirements&&s.maintenanceNote);}
});
test('practical texture, length, time and style choices constrain matches; never pad to five',()=>{
 assert.equal(rankStyles(HAIRSTYLES,prefs()).length,24);
 const filtered=rankStyles(HAIRSTYLES,prefs({texture:'wavy',desiredLength:'short',stylingTime:'5',preferredStyles:['taper']}));assert.equal(filtered.length,1);assert.equal(filtered[0].style.id,'wavy-taper');
 assert.equal(rankStyles(HAIRSTYLES,prefs({texture:'curly',desiredLength:'long',stylingTime:'5'})).length,0);
 const result=recommendStyles(undefined,prefs());assert.equal(result.status,'ready');if(result.status==='ready')assert.equal(result.value.length,5);
});
test('current length blocks immediate longer styles; grow-out is explicit and explained',()=>{
 assert.ok(rankStyles(HAIRSTYLES,prefs({currentLength:'short'})).every(r=>r.style.length==='short'));
 const grow=rankStyles(HAIRSTYLES,prefs({currentLength:'short',desiredLength:'long',allowGrowOut:true}));assert.ok(grow.length);assert.ok(grow.every(r=>r.reasons.some(s=>s.includes('Grow-out option'))));
 assert.equal(rankStyles(HAIRSTYLES,prefs({currentLength:'short',desiredLength:'long'})).length,0);
});
test('optional actual-proportion guidance changes ties, never overrides practical constraints',()=>{
 const p=prefs({texture:'straight',currentLength:'short',desiredLength:'short'}),a=analysis(1.2),before=structuredClone(a);
 const plain=rankStyles(HAIRSTYLES,{...p,useGeometry:false},a),guided=rankStyles(HAIRSTYLES,p,a);
 assert.notEqual(plain[0].style.id,guided[0].style.id);assert.equal(guided[0].style.id,'straight-quiff');assert.ok(guided[0].reasons.some(r=>r.includes('1.20')));assert.deepEqual(a,before);
 const unreviewed={...a,visibility:{reviewed:false,obstructed:[],source:'user-reported' as const}};assert.deepEqual(rankStyles(HAIRSTYLES,p,unreviewed),plain);assert.match(geometryContext(unreviewed),/uncertain/);
 assert.ok(rankStyles(HAIRSTYLES,prefs({texture:'coiled'}),a).every(r=>r.style.texture==='coiled'));
});
test('report snapshot uses current photo, preferences, catalog version and complete image credits',()=>{
 const original=analysis(),snapshot=withStyling(original,prefs({texture:'curly'}),HAIRSTYLES);assert.equal(snapshot.photoId,original.photoId);assert.equal(snapshot.styling?.recommendations.length,5);assert.equal(snapshot.styling?.imageCredits.length,5);assert.equal(snapshot.styling?.catalogVersion,'4.0.0');assert.equal(original.styling,undefined);
 const empty=withStyling(original,prefs({texture:'curly',desiredLength:'long',stylingTime:'5'}),HAIRSTYLES);assert.equal(empty.styling?.recommendations.length,0);assert.equal(empty.styling?.imageCredits.length,0);
});
test('care records retain review date and authoritative source links without photo input',()=>{assert.equal(CARE_REVIEW_DATE,'2026-10-18');for(const s of Object.values(CARE_SOURCES)){assert.equal(s.accessedAt,CARE_REVIEW_DATE);assert.match(s.url,/^https:\/\/(www\.aad\.org|aaoinfo\.org)\//);}});
