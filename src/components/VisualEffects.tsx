import {useId} from 'react';

/** Original decorative artwork. These paths are not detected landmarks or a sample result. */
export function FrameArtwork(){
 const id=useId().replace(/:/g,'');
 return <svg className="frame-artwork" viewBox="0 0 320 360" fill="none" aria-hidden="true"><defs><linearGradient id={`${id}-ink`} x1="70" y1="0" x2="250" y2="340" gradientUnits="userSpaceOnUse"><stop stopColor="#c4f995"/><stop offset=".5" stopColor="#84e8d9"/><stop offset="1" stopColor="#b6a3ff"/></linearGradient><clipPath id={`${id}-mask`}><path d="M160 31C103 30 77 74 81 137L92 211C100 253 133 294 160 304C187 294 220 253 228 211L239 137C243 74 217 30 160 31Z"/></clipPath></defs>
 <g stroke={`url(#${id}-ink)`} strokeWidth=".8"><path d="M160 31C103 30 77 74 81 137L92 211C100 253 133 294 160 304C187 294 220 253 228 211L239 137C243 74 217 30 160 31Z"/><g clipPath={`url(#${id}-mask)`} opacity=".46">{Array.from({length:13},(_,i)=><path key={`h${i}`} d={`M55 ${45+i*22}Q160 ${20+i*24} 265 ${45+i*22}`}/>)}{Array.from({length:9},(_,i)=><path key={`v${i}`} d={`M${86+i*18} 18Q${45+i*29} 170 ${133+i*7} 318`}/>)}</g><path strokeWidth="1.5" d="M103 133Q122 121 142 136M178 136Q198 121 217 133M160 133L148 194Q160 200 173 193M133 229Q160 216 187 229Q160 248 133 229Z"/><path opacity=".5" d="M102 155L133 168L160 146L189 168L218 155M91 187L129 203L160 190L191 203L229 187M108 246L137 262L160 249L183 262L212 246"/>{[[160,31],[81,137],[103,133],[142,136],[178,136],[217,133],[148,194],[173,193],[133,229],[187,229],[160,304],[129,203],[191,203],[137,262],[183,262]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2.5" fill={`url(#${id}-ink)`}/>)}</g><path d="M54 70V47H77M243 47H266V70M54 252V275H77M243 275H266V252" stroke="#c4f995" strokeWidth="1.5" opacity=".7"/>
 </svg>;
}

export function VisualScene({motion,onToggle}:{motion:boolean;onToggle:()=>void}){
 return <figure className="visual-scene"><div className="scene-topline"><span><i/> PERSONAL STYLE STUDIO</span><span>↗</span></div><div className="scene-orbit orbit-a"/><div className="scene-orbit orbit-b"/><div className="scene-face"><FrameArtwork/></div><span className="scene-tag tag-private">↳ Your device. Your data.</span><span className="scene-tag tag-style">✦ A fresh perspective</span><div className="scene-bottom"><figcaption>Illustration only · not an analysis</figcaption><button type="button" className="motion-control" onClick={onToggle} aria-pressed={!motion}>{motion?'Ⅱ Pause effects':'▷ Resume effects'}</button></div></figure>;
}

export type ProcessingStage='preparing'|'loading'|'analyzing';
const phases=[{id:'preparing',label:'Prepare photo',title:'Setting the frame.',detail:'Correcting orientation and preparing your image on this device.'},{id:'loading',label:'Load detector',title:'Getting ready to look.',detail:'Loading the local landmark model. First use can take longer.'},{id:'analyzing',label:'Find landmarks',title:'Finding your frame.',detail:'Running the detector on this still photo, locally. Your results follow if the photo passes the checks.'}] as const;

/** The selected phase follows the real pipeline. No timer, percentage or simulated completion. */
export function ProcessingVisual({stage}:{stage:ProcessingStage}){
 const current=phases.find(p=>p.id===stage)!;
 return <div className="processing-visual" data-stage={stage}><div className="processing-art"><FrameArtwork/><span className="scan-sweep"/></div><div className="processing-copy"><span className="eyebrow">LOCAL PROCESSING</span><h3>{current.title}</h3><p>{current.detail}</p><ol className="processing-phases" aria-label="Analysis stages">{phases.map(p=><li key={p.id} aria-current={p.id===stage?'step':undefined}><span aria-hidden="true">{p.id===stage?'◉':'○'}</span>{p.label}{p.id===stage&&<span className="visually-hidden"> · current stage</span>}</li>)}</ol><p className="processing-footnote">Illustrative animation · no photo upload</p></div></div>;
}
