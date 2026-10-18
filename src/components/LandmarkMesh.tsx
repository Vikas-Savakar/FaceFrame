import { useEffect, useRef, useState } from 'react';
import type { FaceAnalysis } from '../contracts';
type Mesh = Extract<FaceAnalysis['estimatedMesh'], {status:'ready'}>['value'];
/** Tiny orthographic 3D wireframe renderer; canvas 2D means no extra WebGL requirement. */
export default function LandmarkMesh({ mesh }: { mesh: Mesh }) {
  const canvas=useRef<HTMLCanvasElement>(null);
  const [yaw,setYaw]=useState(0), [pitch,setPitch]=useState(0), [unavailable,setUnavailable]=useState(false);
  const drag=useRef<{x:number;y:number;yaw:number;pitch:number} | undefined>(undefined);
  useEffect(()=>{
    const el=canvas.current; if(!el)return; const ctx=el.getContext('2d');
    if(!ctx){setUnavailable(true);return;}
    el.width=760;el.height=620;ctx.fillStyle='#eff2e8';ctx.fillRect(0,0,760,620);
    const y=yaw*Math.PI/180,p=pitch*Math.PI/180, cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p);
    const points=mesh.vertices.map(v=>{const x=v.x*cy+v.z*sy,z=-v.x*sy+v.z*cy;return{x:380+x*420,y:310-(v.y*cp-z*sp)*420};});
    ctx.strokeStyle='#527461';ctx.lineWidth=.8;ctx.beginPath();
    const edges=new Set<string>();
    for(const [a,b,c] of mesh.triangles)for(const [start,end] of [[a,b],[b,c],[c,a]]){
      const key=[start,end].sort((a,b)=>a-b).join(':');if(edges.has(key))continue;edges.add(key);
      const u=points[start],v=points[end];if(!u||!v)continue;ctx.moveTo(u.x,u.y);ctx.lineTo(v.x,v.y);
    }
    ctx.stroke();ctx.fillStyle='#355b4c';for(const v of points){ctx.beginPath();ctx.arc(v.x,v.y,1,0,Math.PI*2);ctx.fill();}
    return()=>{el.width=el.height=0;};
  },[mesh,yaw,pitch]);
  if(unavailable)return <p role="status">The mesh renderer is unavailable in this browser. Your 2D outline and measurements remain available.</p>;
  return <div className="mesh-view"><canvas ref={canvas} role="img" aria-label="Rotatable estimated landmark wireframe, a visual approximation only" onPointerDown={event=>{drag.current={x:event.clientX,y:event.clientY,yaw,pitch};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{const d=drag.current;if(d){setYaw(Math.max(-60,Math.min(60,d.yaw+(event.clientX-d.x)*.4)));setPitch(Math.max(-35,Math.min(35,d.pitch+(event.clientY-d.y)*.4)));}}} onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}/>
    <p>Drag to turn, or use the keyboard-accessible sliders. View rotation is not a face measurement.</p>
    <div className="mesh-controls"><label>Turn the view<input type="range" aria-label="Turn the mesh view" min="-60" max="60" value={yaw} onChange={e=>setYaw(Number(e.target.value))}/></label><label>Tilt the view<input type="range" aria-label="Tilt the mesh view" min="-35" max="35" value={pitch} onChange={e=>setPitch(Number(e.target.value))}/></label><button className="button secondary" onClick={()=>{setYaw(0);setPitch(0);}}>Reset view</button></div>
  </div>;
}
