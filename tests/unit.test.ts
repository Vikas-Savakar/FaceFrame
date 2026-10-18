import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectImage } from '../src/modules/imageMetadata.ts';
import { normalizedSharpness, qualityChecks } from '../src/modules/quality.ts';
function jpeg(orientation = 1, width = 640, height = 480) {
  const exif = [69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,orientation,0,0,0,0,0,0,0];
  return new Uint8Array([255,216,255,225,0,exif.length+2,...exif,255,192,0,11,8,height>>8,height&255,width>>8,width&255,1,1,17,0,255,217]);
}
test('JPEG dimensions and all 8 EXIF orientations are read, metadata stripped', () => {
  for(let n=1;n<=8;n++) { const meta=inspectImage(jpeg(n)); assert.equal(meta.orientation,n); assert.equal(meta.width,640); assert.equal(meta.height,480); assert.equal(new TextDecoder().decode(meta.cleanBytes).includes('Exif'),false); }
});
test('format detection uses bytes, rejects invalid headers and truncated EXIF', () => {
  assert.throws(()=>inspectImage(new TextEncoder().encode('not a jpeg')));
  assert.throws(()=>inspectImage(new Uint8Array([255,216,255,225,0,100])));
  assert.throws(()=>inspectImage(jpeg(9)));
});
test('PNG dimensions and malformed chunk lengths', () => {
  const png=new Uint8Array(33); png.set([137,80,78,71,13,10,26,10]); const v=new DataView(png.buffer);v.setUint32(8,13);png.set([73,72,68,82],12);v.setUint32(16,8000);v.setUint32(20,6000);
  assert.equal(inspectImage(png).width,8000); v.setUint32(8,0xffffffff);assert.throws(()=>inspectImage(png));
});
test('normalized detail is invariant to darkening, brightness and contrast changes', () => {
  const data=Float32Array.from({length:64*64},(_,i)=>100+40*Math.sin(i*.7)+10*Math.cos(i*.3));
  const value=normalizedSharpness(data,64,64);
  const darker=Float32Array.from(data,x=>x*.25+7);
  assert.ok(Math.abs(value-normalizedSharpness(darker,64,64))<1e-5);
  assert.equal(normalizedSharpness(new Float32Array(64*64).fill(100),64,64),0);
});
function points() { const p=Array.from({length:478},()=>({x:.5,y:.5,z:0}));p[10]={x:.5,y:.2,z:0};p[152]={x:.5,y:.8,z:0};p[33]={x:.35,y:.4,z:0};p[263]={x:.65,y:.4,z:0};p[234]={x:.25,y:.5,z:0};p[454]={x:.75,y:.5,z:0};p[1]={x:.5,y:.55,z:0};return p; }
const failed=(p:ReturnType<typeof points>,sharpness=.1)=>qualityChecks(p,{width:1000,height:1000},sharpness).filter(c=>c.outcome.status==='ready'&&c.outcome.value==='fail').map(c=>c.id);
test('suitable geometry passes; size, clipping, roll and severe blur are flagged',()=>{
  assert.deepEqual(failed(points()),[]);
  const small=points().map(p=>({...p,x:.5+(p.x-.5)*.1,y:.5+(p.y-.5)*.1}));assert.ok(failed(small).includes('size'));
  const clipped=points();clipped[10].y=.001;assert.ok(failed(clipped).includes('framing'));
  const rolled=points();rolled[263].y=.7;assert.ok(failed(rolled).includes('pose'));
  assert.ok(failed(points(),.001).includes('blur'));
});
