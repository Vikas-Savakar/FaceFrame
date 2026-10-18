// Developer-only checks: import in a Vite dev browser. Never included in the production entry.
import { prepareImage } from '../src/modules/imagePreparation';
import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {PhotoView} from '../src/components/PhotoView';
function assert(condition: unknown, name: string): asserts condition { if (!condition) throw new Error(`Check failed: ${name}`); }
const toBlob = (canvas: HTMLCanvasElement, type = 'image/png') => new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), type));
function exif(n: number) { return new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,n,0,0,0,0,0,0,0]); }
export async function preparationChecks() {
  const passed: string[] = [];
  async function reject(blob: Blob, label: string) { let rejected = false; try { await prepareImage(blob, 'upload'); } catch { rejected = true; } assert(rejected, label); passed.push(label); }
  await reject(new Blob(['not an image'], { type: 'image/jpeg' }), 'renamed unsupported input rejected');
  await reject(new Blob([new Uint8Array(12 * 1024 * 1024 + 1)]), '12 MiB byte limit');
  const canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00'];
  colors.forEach((color,i)=>{ ctx.fillStyle=color;ctx.fillRect((i%2)*40,Math.floor(i/2)*24,40,24); });
  const jpeg = new Uint8Array(await (await toBlob(canvas,'image/jpeg')).arrayBuffer());
  const orders = [[0,1,2,3],[1,0,3,2],[3,2,1,0],[2,3,0,1],[0,2,1,3],[2,0,3,1],[3,1,2,0],[1,3,0,2]];
  for(let n=1;n<=8;n++) {
    const blob = new Blob([jpeg.slice(0,2),exif(n),jpeg.slice(2)],{type:'image/jpeg'});
    const photo=await prepareImage(blob,'upload');
    assert(photo.dimensions.width===(n>=5?48:80),'oriented width'); assert(photo.dimensions.height===(n>=5?80:48),'oriented height');
    const bitmap=await createImageBitmap(photo.blob); const out=document.createElement('canvas');out.width=bitmap.width;out.height=bitmap.height;const c=out.getContext('2d')!;c.drawImage(bitmap,0,0);bitmap.close();
    const coords=[[.2,.2],[.8,.2],[.2,.8],[.8,.8]];
    const actual=coords.map(([x,y])=>{const rgb=c.getImageData(Math.floor(x*out.width),Math.floor(y*out.height),1,1).data;return rgb[0]>180&&rgb[1]>180?3:rgb[0]>180?0:rgb[1]>180?1:2;});
    assert(actual.every((v,i)=>v===orders[n-1][i]),`EXIF ${n} corner orientation`);out.width=out.height=0;
  }
  passed.push('all 8 JPEG EXIF orientations: dimensions and colored corner pixels');
  const bomb=jpeg.slice();for(let p=2;p<bomb.length-8;p++){if(bomb[p]===255&&[192,194].includes(bomb[p+1])){bomb[p+5]=0x20;bomb[p+6]=0;bomb[p+7]=0x20;bomb[p+8]=0;break;}}
  await reject(new Blob([bomb],{type:'image/jpeg'}),'24 MP header rejected before decode');
  const corrupt=jpeg.slice(0, Math.min(120,jpeg.length));await reject(new Blob([corrupt],{type:'image/jpeg'}),'corrupt JPEG actual decode rejected');
  canvas.width=2000;canvas.height=1000;ctx.fillStyle='#71896e';ctx.fillRect(0,0,2000,1000);
  for(const type of ['image/jpeg','image/png','image/webp']){const p=await prepareImage(await toBlob(canvas,type),'upload');assert(p.dimensions.width===1280&&p.dimensions.height===640,`aspect ratio ${type}`);assert(p.transform.crop===null&&!p.transform.mirrored,'unmirrored uncropped image');}
  passed.push('JPEG/PNG/WebP real decoding, aspect-preserving 1280px resize');
  const valid=await toBlob(canvas),uuid=Object.getOwnPropertyDescriptor(crypto,'randomUUID');
  try{Object.defineProperty(crypto,'randomUUID',{configurable:true,value:undefined});let message='';try{await prepareImage(valid,'upload');}catch(e){message=e instanceof Error?e.message:'';}assert(message.includes('HTTPS or localhost'),'missing secure UUID API is explained');passed.push('missing secure UUID API: readable HTTPS/localhost error');}
  finally{if(uuid)Object.defineProperty(crypto,'randomUUID',uuid);else Reflect.deleteProperty(crypto,'randomUUID');canvas.width=canvas.height=0;}
  return passed;
}
export async function fallbackCheck() {
  const worker = new Worker(new URL('./no-gpu.worker.ts', import.meta.url), { type: 'module' });
  try {
    const message = await new Promise<{ type: string; delegate?: string; fallback?: boolean }>((resolve,reject)=>{
      const timer = setTimeout(()=>reject(new Error('CPU fallback timeout')),45000);
      worker.onmessage = event=>{if(event.data.type==='harness-ready'){worker.postMessage({type:'init',base:location.origin+'/',delegate:'GPU'});return;}clearTimeout(timer);resolve(event.data);};
      worker.onerror = ()=>{clearTimeout(timer);reject(new Error('CPU fallback worker failed'));};
    });
    assert(message.type==='ready'&&message.delegate==='CPU'&&message.fallback===true,'GPU failure produces real CPU-ready state');
    return 'GPU initialization disabled in test worker; real CPU initialization succeeded';
  } finally {worker.terminate();}
}
export async function dropBlank(count = 1) {
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#777';ctx.fillRect(0,0,640,480);
  const blob=await toBlob(canvas);const data=new DataTransfer();
  for(let i=0;i<count;i++) data.items.add(new File([blob],`synthetic-no-face-${i}.png`,{type:'image/png'}));
  document.querySelector('.capture-card')!.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data}));canvas.width=canvas.height=0;
}
/** Regression for an actual null canvas context followed by a prop-driven redraw. No face/model fixture. */
export async function previewRecoveryCheck(){
 const source=document.createElement('canvas');source.width=80;source.height=48;
 source.getContext('2d')!.fillRect(0,0,80,48);
 const photo=await prepareImage(await toBlob(source),'upload');source.width=source.height=0;
 const host=document.createElement('section');document.body.append(host);const root=createRoot(host);
 const original=HTMLCanvasElement.prototype.getContext;
 const wait=async(test:()=>boolean)=>{const end=performance.now()+3000;while(!test()){if(performance.now()>end)throw new Error('Preview recovery timed out');await new Promise(r=>setTimeout(r,10));}};
 try{
  HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){return host.contains(this)?null:original.apply(this,args);} as typeof original;
  root.render(createElement(PhotoView,{photo,mode:'photo'}));
  await wait(()=>!!host.querySelector('[role=alert]'));
  assert(!!host.querySelector('canvas'),'canvas remains mounted after failure');
  HTMLCanvasElement.prototype.getContext=original;
  root.render(createElement(PhotoView,{photo,mode:'landmarks'}));
  await wait(()=>!host.querySelector('[role=alert]')&&host.querySelector('canvas')?.width===80);
  assert(!host.querySelector('canvas')!.hidden,'recovered canvas is visible');
  return 'Canvas context failure retained the ref; subsequent redraw recovered using actual bitmap decoding.';
 }finally{HTMLCanvasElement.prototype.getContext=original;root.unmount();host.remove();}
}
