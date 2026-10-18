import type { CatalogStyle, FaceAnalysis, Recommendation, Result, StylingPreferences } from '../contracts.ts';

import { HAIRSTYLES } from './hairstyleCatalog.ts';

export const CATALOG_VERSION='4.0.0';

export const DEFAULT_PREFERENCES:StylingPreferences={presentation:'any',texture:'any',currentLength:'any',desiredLength:'any',stylingTime:'any',preferredStyles:[],facialHair:'unknown',allowGrowOut:false,useGeometry:true};

export const STYLE_TAGS=['crop','bob','layers','fringe','taper','volume'];

export const MATCH_METHOD={name:'FaceFrame preferences-first styling rules',version:'4.1.0',sources:[]};

const featured=['textured-crop','wavy-lob','curly-long-layers','rounded-coils','straight-bob'];
const masculineFeatured=['textured-crop','straight-side-part','straight-quiff','wavy-taper','curly-taper','coiled-high-top'];
const editorialOrder=(id:string,presentation?:string)=>{const order=presentation==='masculine'?masculineFeatured:featured;const index=order.indexOf(id);return index<0?order.length:index;};
const lengths={short:1,medium:2,long:3};

export function geometryContext(analysis?:FaceAnalysis):string {

  if(!analysis)return 'No current face report. Suggestions use your choices only.';

  if(!analysis.visibility?.reviewed||analysis.approximateShape.status!=='ready'||analysis.approximateShape.value.label==='uncertain')return 'Face geometry is uncertain or visibility is unassessed. Your practical preferences take priority; no contour guidance is applied.';

  return 'Optional contour guidance uses this photo’s approximate proportions. It is a styling idea, not a better or perfect face shape.';

}

export function rankStyles(catalog:CatalogStyle[],preferences:StylingPreferences,analysis?:FaceAnalysis):Array<{style:CatalogStyle;reasons:string[]}> {

  const p=preferences;

  const geometryOK=p.useGeometry&&analysis?.visibility?.reviewed&&analysis.approximateShape.status==='ready'&&analysis.approximateShape.value.label!=='uncertain';

  const metric=(id:string)=>{const m=analysis?.measurements.status==='ready'?analysis.measurements.value.find(m=>m.id===id)?.value:undefined;return m?.status==='ready'&&Number.isFinite(m.value)?m.value:undefined;};

  return catalog.filter(s=>s.referenceImage.status==='ready'&&(!p.presentation||p.presentation==='any'||s.presentations.includes(p.presentation))&&(p.texture==='any'||s.texture===p.texture)&&(p.desiredLength==='any'||s.length===p.desiredLength)&&(p.stylingTime==='any'||s.dailyMinutes<=Number(p.stylingTime))&&(!p.preferredStyles.length||p.preferredStyles.some(tag=>s.tags.includes(tag)))&&(p.currentLength==='any'||p.allowGrowOut||lengths[s.length]<=lengths[p.currentLength])).map(style=>{

    let priority=p.currentLength===style.length?20:0;

    const reasons=[p.texture==='any'?`Reference texture: ${style.texture==='coiled'?'tightly coiled':style.texture}.`:`Matches your ${p.texture==='coiled'?'tightly coiled':p.texture} texture choice.`,p.desiredLength==='any'?`${style.length} length option.`:`Matches your desired ${style.length} length.`,`About ${style.dailyMinutes} minutes of daily styling is a planning estimate; your routine may vary.`];

    if(p.presentation&&p.presentation!=='any')reasons.unshift(`Matches your chosen ${p.presentation} style presentation.`);

    if(p.preferredStyles.length)reasons.push(`Matches preferred style: ${style.tags.filter(t=>p.preferredStyles.includes(t)).join(', ')}.`);

    if(p.currentLength!=='any'&&lengths[style.length]>lengths[p.currentLength])reasons.push('Grow-out option: more length is needed first; this is not an immediate cut.');

    else if(p.currentLength===style.length)reasons.push('Within your selected current length range; ask a stylist to check actual length and density.');

    else if(p.currentLength!=='any')reasons.push('A shorter cut from your selected current length range.');

    if(geometryOK){const h=metric('height-cheek'),l=metric('lower-cheek');if(h!==undefined&&h>=1.5&&style.tags.includes('fringe')){priority++;reasons.push(`Visible height/cheek span ${h.toFixed(2)}: a fringe offers an optional change to the visible outline.`);}if(h!==undefined&&h<1.3&&style.tags.includes('volume')){priority++;reasons.push(`Visible height/cheek span ${h.toFixed(2)}: top volume offers an optional vertical styling line.`);}if(l!==undefined&&l>=.82&&style.tags.includes('layers')){priority++;reasons.push(`Lower/cheek contour span ${l.toFixed(2)}: layers offer an optional softer frame around the visible contour.`);}}

    return {style,reasons,priority};

  }).sort((a,b)=>b.priority-a.priority||editorialOrder(a.style.id,p.presentation)-editorialOrder(b.style.id,p.presentation)||a.style.id.localeCompare(b.style.id)).map(({style,reasons})=>({style,reasons}));

}

export function recommendStyles(analysis:FaceAnalysis|undefined,preferences:StylingPreferences=DEFAULT_PREFERENCES,catalog:CatalogStyle[]=HAIRSTYLES):Result<Recommendation[]> {

 return {status:'ready',value:rankStyles(catalog,preferences,analysis).slice(0,5).map(({style,reasons})=>({id:`style-${style.id}`,category:'hairstyle',provenance:'styling-advice',content:{status:'ready',value:{title:style.name,explanation:reasons.join(' '),hairstyleId:style.id}},rule:MATCH_METHOD,sources:style.referenceImage.status==='ready'?[style.referenceImage.value.source]:[],limitations:[geometryContext(analysis),'Reference image only; not a preview of you. Hair density, growth patterns and real length need a stylist’s assessment.']}))};

}



/** Full current styling snapshot for report consumers/export in a later phase. */

export function withStyling(analysis:FaceAnalysis,preferences:StylingPreferences,catalog:CatalogStyle[]):FaceAnalysis {

 const result=recommendStyles(analysis,preferences,catalog),recommendations=result.status==='ready'?result.value:[];

 const ids=new Set(recommendations.flatMap(r=>r.content.status==='ready'&&r.content.value.hairstyleId?[r.content.value.hairstyleId]:[]));

 return {...analysis,styling:{preferences:{...preferences,preferredStyles:[...preferences.preferredStyles]},recommendations,catalogVersion:CATALOG_VERSION,imageCredits:catalog.filter(s=>ids.has(s.id)).map(s=>s.referenceImage)}};

}

