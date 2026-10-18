import type {FaceAnalysis,PhotoAsset} from '../contracts';
import {structureDrawing,SPAN_LETTERS} from './reportRendering.ts';
import {formatMeasurement} from './geometry.ts';
export function structureImageLayout(width:number,height:number){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error('Invalid image dimensions.');
 const outputWidth=Math.max(800,width),scale=Math.min(outputWidth/width,2048/height);
 return{outputWidth,scale,imageHeight:Math.max(1,Math.round(height*scale)),offsetX:(outputWidth-width*scale)/2};
}
/** Always draws on a fresh canvas. Omit photo to make copying photo pixels impossible. */
export async function renderStructureImage(analysis:FaceAnalysis,photo?:PhotoAsset,signal?:AbortSignal):Promise<Blob>{
 const d=structureDrawing(analysis);if(photo&&photo.id!==analysis.photoId)throw new Error('Photo and structure do not match.');
 const canvas=document.createElement('canvas');let bitmap:ImageBitmap|undefined;
 const cancelled=()=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
 try{
  // Bound the image area even for very tall accepted frames; retain readable footer width.
  cancelled();const{outputWidth,scale,imageHeight,offsetX}=structureImageLayout(d.width,d.height);canvas.width=outputWidth;canvas.height=imageHeight+220;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image export is unavailable in this browser.');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(offsetX,0);ctx.scale(scale,scale);
  if(photo){bitmap=await createImageBitmap(photo.blob);cancelled();ctx.drawImage(bitmap,0,0,d.width,d.height);bitmap.close();bitmap=undefined;}
  ctx.strokeStyle=photo?'#00ffd0':'#355b4c';ctx.lineWidth=Math.max(1,d.width/600);ctx.beginPath();
  for(const {a,b}of d.edges){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();
  ctx.font=`${Math.max(12,d.font)}px Arial`;ctx.fillStyle=photo?'#fff4b5':'#263e34';
  for(const span of d.spans){const a=d.points.get(span.from)!,b=d.points.get(span.to)!;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillText(SPAN_LETTERS[span.id]??span.id,(a.x+b.x)/2+5,(a.y+b.y)/2-5);}
  ctx.restore();ctx.fillStyle='#fff';ctx.fillRect(0,imageHeight,canvas.width,220);ctx.fillStyle='#263e34';const font=Math.max(10,Math.min(15,canvas.width/40));ctx.font=`${font}px Arial`;
  const lines=['FaceFrame - annotated 2D structure',photo?'Photo included by explicit choice (prepared, unmirrored).':'Photo excluded - detected outline and calculated spans only.',...(analysis.measurements.status==='ready'?analysis.measurements.value.map(m=>`${m.label}: ${formatMeasurement(m)}`):['Measurements unavailable.']),'Visible contour estimates, not bone structure or physical depth.','H=height C=cheek L=lower U=upper N=nose-chin E=eye gap',`Geometry ${analysis.geometryMethod?.version??'unavailable'} | Model ${analysis.landmarks.status==='ready'?analysis.landmarks.value.model.version:'unavailable'}`];
  lines.forEach((line,i)=>ctx.fillText(line,12,imageHeight+22+i*17,canvas.width-24));cancelled();
  const blob=await new Promise<Blob>((resolve,reject)=>{
   const abort=()=>{signal?.removeEventListener('abort',abort);reject(new DOMException('Export cancelled.','AbortError'));};
   signal?.addEventListener('abort',abort,{once:true});
   if(signal?.aborted){abort();return;}
   try{canvas.toBlob(b=>{signal?.removeEventListener('abort',abort);if(signal?.aborted){abort();return;}b?resolve(b):reject(new Error('The browser could not encode the structure image.'));},'image/png');}
   catch(error){signal?.removeEventListener('abort',abort);reject(error);}
  });cancelled();return blob;
 }finally{bitmap?.close();canvas.width=canvas.height=0;}
}
/** Blob URLs are temporary download handles; no photo/report data appears in a URL string. */
export class LocalDownloads{
 private pending=new Map<string,ReturnType<typeof setTimeout>>();
 save(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.hidden=true;document.body.append(a);try{a.click();}finally{a.remove();const timer=setTimeout(()=>{URL.revokeObjectURL(url);this.pending.delete(url);},1000);this.pending.set(url,timer);}}
 dispose(){for(const[url,timer]of this.pending){clearTimeout(timer);URL.revokeObjectURL(url);}this.pending.clear();}
}
