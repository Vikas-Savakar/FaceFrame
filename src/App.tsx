import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Section } from './components/Sections';
import CaptureWorkspace from './components/CaptureWorkspace';
import StyleGroupPicker,{styleGroupLabel} from './components/StyleGroupPicker';
import {VisualScene} from './components/VisualEffects';
import type { PhotoAsset, VisibilityAssessment, StylingPreferences } from './contracts';
import type { DetectionOutput } from './modules/detectionTypes';
import type { AnalysisSession } from './modules/session';
import { calculateGeometry } from './modules/geometry';

import { LoadingState, SectionBoundary } from './components/AsyncState';
import { DEFAULT_PREFERENCES, withStyling } from './modules/recommendations';
import { HAIRSTYLES } from './modules/hairstyleCatalog';
import type { GallerySession } from './components/Hairstyles';
import type { CareChoices } from './components/Care';
const Hairstyles=lazy(()=>import('./components/Hairstyles'));
const Care=lazy(()=>import('./components/Care'));
const Sections = lazy(() => import('./components/Sections'));
const StructureReport = lazy(() => import('./components/StructureReport'));
const navigation: { id: Section; label: string }[] = [{ id: 'start', label: 'Analyze' }, { id: 'report', label: 'Results' }, { id: 'hairstyles', label: 'Hairstyles' }, { id: 'care', label: 'Care' }, { id: 'about', label: 'About / Privacy' }];
function FrameIcon({ small = false }: { small?: boolean }) { return <svg width={small ? 29 : 44} height={small ? 29 : 44} viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M17 8H8v10m23-10h9v10M8 30v10h9m23-10v10h-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><ellipse cx="24" cy="23" rx="8" ry="12" stroke="currentColor" strokeWidth="1.3"/></svg>; }
export default function App() {
  const [section, setSection] = useState<Section>('start');
  const [visit,setVisit]=useState(0);
  const [requestExport,setRequestExport]=useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionOn,setMotionOn]=useState(true);
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [preferences,setPreferences]=useState<StylingPreferences>({...DEFAULT_PREFERENCES,preferredStyles:[]});
  const [gallery,setGallery]=useState<GallerySession>({favourites:[],comparison:[],showAll:false});
  const [care,setCare]=useState<CareChoices>({concern:'general',jawline:false});
  function enrich(result:AnalysisSession['analysis']):AnalysisSession['analysis'] {return result.status==='ready'?{status:'ready',value:withStyling(result.value,preferences,HAIRSTYLES)}:result;}
  function updatePreferences(next:StylingPreferences){if(next.presentation!==preferences.presentation)setGallery(current=>({...current,showAll:false,comparison:[]}));setPreferences(next);setSession(current=>current&&current.analysis.status==='ready'?{...current,analysis:{status:'ready',value:withStyling(current.analysis.value,next,HAIRSTYLES)}}:current);}
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useEffect(() => { if (firstRender.current) { firstRender.current = false; return; } mainRef.current?.focus(); }, [section,visit]);
  function navigate(next: Section) { setSection(next); setMenuOpen(false); }
  function storeResult(photo: PhotoAsset, detection: DetectionOutput) {
    const analysis:AnalysisSession['analysis']=detection.frame.status==='ready'?enrich(calculateGeometry(detection.frame.value,detection.checks)):detection.frame.status==='unavailable'?{status:'unavailable',reason:detection.frame.reason}:{status:'unavailable',reason:{code:'insufficient-data',message:'No accepted landmark frame is available for this photo.'}};
    setSession({photo,detection,analysis});
    if(analysis.status==='ready')navigate('report');
  }
  function reviewVisibility(visibility: VisibilityAssessment) {
    const photoId=session?.photo.id;
    setSession(current=>current&&current.photo.id===photoId&&current.detection.frame.status==='ready'?{...current,analysis:enrich(calculateGeometry(current.detection.frame.value,current.detection.checks,visibility))}:current);
  }
  function startOver(){setRequestExport(false);setSession(null);setPreferences({...DEFAULT_PREFERENCES,preferredStyles:[]});setGallery({favourites:[],comparison:[],showAll:false});setCare({concern:'general',jawline:false});setVisit(v=>v+1);navigate('start');}
  function retake() { setRequestExport(false);setSession(null); navigate('start'); }
  return <div className="app-shell" data-motion={motionOn?'on':'paused'}><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><a href="#main" className="brand" onClick={() => navigate('start')} aria-label="FaceFrame home"><FrameIcon small /><span>FaceFrame<span className="brand-dot">.</span></span></a><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close menu' : 'Menu'} <span aria-hidden="true">☰</span></button><nav id="main-nav" className={menuOpen ? 'open' : ''} aria-label="Main navigation">{navigation.map(item => <button key={item.id} aria-current={section === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav>{session?.analysis.status==='ready'?<button className="button header-report" aria-label="↓ Download report" onClick={()=>{setRequestExport(true);navigate('report');}}><span className="header-wide" aria-hidden="true">↓ Download report</span><span className="header-short" aria-hidden="true">↓ Report</span></button>:<a className="button header-report" href="#workspace" aria-label="Start analysis →" onClick={()=>navigate('start')}><span className="header-wide" aria-hidden="true">Start analysis →</span><span className="header-short" aria-hidden="true">Start ↗</span></a>}</header>
  <main id="main" ref={mainRef} tabIndex={-1}><nav className="journey" aria-label="Analysis steps">{([{id:'start',label:'Your photo'},{id:'report',label:'Your results'},{id:'hairstyles',label:'Your styles'}] as const).map((step,i)=><button key={step.id} aria-current={section===step.id?'step':undefined} onClick={()=>navigate(step.id)}><span>{i+1}</span>{step.label}</button>)}<span className="journey-privacy">◈ {preferences.presentation&&preferences.presentation!=='unset'?styleGroupLabel(preferences.presentation):'Private by design'}</span></nav>{section === 'start' ? <>
    <section className="hero refined-hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><span className="status-dot"/> YOUR PERSONAL STYLE LAB</p><h1 id="hero-title">Your face.<br/><em>Your next era.</em><span className="hero-spark" aria-hidden="true">✳</span></h1><p className="hero-description">A little insight. A fresh look. Explore your face proportions and find hairstyle references that feel like you.</p><div className="hero-actions"><a className="button hero-cta" href="#workspace">Find my frame <span aria-hidden="true">↗</span></a><button className="button secondary" onClick={()=>navigate('hairstyles')}>Explore styles <span aria-hidden="true">→</span></button></div><div className="hero-trust"><span>↳ On-device analysis</span><span>◇ No account</span><span>↓ Free local report</span></div></div><VisualScene motion={motionOn} onToggle={()=>setMotionOn(!motionOn)}/></section>
    <StyleGroupPicker value={preferences.presentation} onChange={presentation=>updatePreferences({...preferences,presentation})}/>
    <CaptureWorkspace key={visit} onReport={() => navigate('report')} initialPhoto={session?.photo} initialOutput={session?.detection} onResult={storeResult} onInvalidate={()=>setSession(null)}/>    <section className="privacy-strip"><span className="privacy-symbol" aria-hidden="true">↳</span><div><h2>Your face. Your data. Your choice.</h2><p>Built for local processing, with no photo storage or account required.</p></div><button className="text-link" onClick={() => navigate('about')}>Our privacy approach <span aria-hidden="true">↗</span></button></section>
  </> : <SectionBoundary key={section}><Suspense fallback={<LoadingState/>}>{section==='report'?<StructureReport session={session} onVisibility={reviewVisibility} onRetake={retake} onStyles={()=>navigate('hairstyles')} onCare={()=>navigate('care')} onDelete={startOver} favouriteIds={gallery.favourites} care={care} requestExport={requestExport} onExportHandled={()=>setRequestExport(false)}/>:section==='hairstyles'?<Hairstyles preferences={preferences} onPreferences={updatePreferences} gallery={gallery} onGallery={setGallery} analysis={session?.analysis.status==='ready'?session.analysis.value:undefined}/>:section==='care'?<Care choices={care} onChange={setCare} facialHair={preferences.facialHair} onStyles={()=>navigate('hairstyles')}/>:<Sections section={section} onStart={() => navigate('start')}/>}</Suspense></SectionBoundary>}</main><footer className="site-footer"><span className="footer-brand">FaceFrame.</span><span>Personal perspective. Honest limitations.</span><button className="text-link motion-control" aria-pressed={!motionOn} onClick={()=>setMotionOn(!motionOn)}>{motionOn?'Pause visual effects':'Resume visual effects'}</button><button className="text-link" onClick={startOver}>Start over / Delete current analysis</button></footer></div>;
}


