import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Section } from './components/Sections';
import CaptureWorkspace from './components/CaptureWorkspace';
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
const navigation: { id: Section; label: string }[] = [{ id: 'start', label: 'Get started' }, { id: 'report', label: 'Report' }, { id: 'hairstyles', label: 'Hairstyles' }, { id: 'care', label: 'Care' }, { id: 'about', label: 'About / Privacy' }];
function FrameIcon({ small = false }: { small?: boolean }) { return <svg width={small ? 29 : 44} height={small ? 29 : 44} viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M17 8H8v10m23-10h9v10M8 30v10h9m23-10v10h-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><ellipse cx="24" cy="23" rx="8" ry="12" stroke="currentColor" strokeWidth="1.3"/></svg>; }
function Illustration() { return <div className="illustration" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><svg viewBox="0 0 360 380" fill="none"><path className="shoulder" d="M37 380c8-62 52-79 105-95l8-36h60l8 36c53 16 97 33 105 95"/><path className="head" d="M109 139c-8-72 28-111 71-111s79 39 71 111l-11 64c-6 38-37 72-60 72s-54-34-60-72Z"/><path d="M109 139c-19-17-21 11-12 35 5 13 13 20 21 16m133-51c19-17 21 11 12 35-5 13-13 20-21 16M132 137q19-12 34 0m28 0q15-12 34 0m-48 4-9 49h18m-36 28q27 15 54 0"/><path className="guide-line" d="M79 140h202M106 219h148M180 12v282"/><path className="frame-corner" d="M79 66V43h23m156 0h23v23M79 246v23h23m156 0h23v-23"/></svg><span className="illustration-label">A FRESH PERSPECTIVE</span></div>; }
export default function App() {
  const [section, setSection] = useState<Section>('start');
  const [visit,setVisit]=useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
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
    setSession({photo,detection,analysis:detection.frame.status==='ready' ? enrich(calculateGeometry(detection.frame.value,detection.checks)) : detection.frame.status==='unavailable'?{status:'unavailable',reason:detection.frame.reason}:{status:'unavailable',reason:{code:'insufficient-data',message:'No accepted landmark frame is available for this photo.'}}});
  }
  function reviewVisibility(visibility: VisibilityAssessment) {
    const photoId=session?.photo.id;
    setSession(current=>current&&current.photo.id===photoId&&current.detection.frame.status==='ready'?{...current,analysis:enrich(calculateGeometry(current.detection.frame.value,current.detection.checks,visibility))}:current);
  }
  function startOver(){setSession(null);setPreferences({...DEFAULT_PREFERENCES,preferredStyles:[]});setGallery({favourites:[],comparison:[],showAll:false});setCare({concern:'general',jawline:false});setVisit(v=>v+1);navigate('start');}
  function retake() { setSession(null); navigate('start'); }
  return <><a className="skip-link" href="#main">Skip to content</a><header className="site-header"><a href="#main" className="brand" onClick={() => navigate('start')} aria-label="FaceFrame home"><FrameIcon small /><span>FaceFrame<span className="brand-dot">.</span></span></a><button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? 'Close menu' : 'Menu'} <span aria-hidden="true">☰</span></button><nav id="main-nav" className={menuOpen ? 'open' : ''} aria-label="Main navigation">{navigation.map(item => <button key={item.id} aria-current={section === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav><span className="header-note"><span/> Private by design</span></header>
  <main id="main" ref={mainRef} tabIndex={-1}>{section === 'start' ? <>
    <section className="hero" aria-labelledby="hero-title"><div className="hero-copy"><p className="eyebrow"><span className="mini-line"/> A NEW WAY TO SEE YOURSELF</p><h1 id="hero-title">Your face.<br />A fresh <em>perspective.</em></h1><p className="hero-description">Explore your proportions. Discover styling possibilities.<br className="desktop-break"/> Start with a photo, and keep the experience yours.</p><a className="text-link" href="#workspace">Start with your photo <span aria-hidden="true">↘</span></a><div className="hero-detail"><span aria-hidden="true">◈</span> Designed for your browser. No account needed.</div></div><div className="hero-visual"><span className="visual-tag">PERSONAL INSIGHT, WITH PERSPECTIVE</span><Illustration/><span className="visual-caption">Illustration only · no analysis shown</span><span className="visual-number" aria-hidden="true">05 / 05</span></div></section>
    <CaptureWorkspace key={visit} onReport={() => navigate('report')} initialPhoto={session?.photo} initialOutput={session?.detection} onResult={storeResult} onInvalidate={()=>setSession(null)}/>    <section className="privacy-strip"><span className="privacy-symbol" aria-hidden="true">↳</span><div><h2>Your face. Your data. Your choice.</h2><p>Built for local processing, with no photo storage or account required.</p></div><button className="text-link" onClick={() => navigate('about')}>Our privacy approach <span aria-hidden="true">↗</span></button></section>
  </> : <SectionBoundary key={section}><Suspense fallback={<LoadingState/>}>{section==='report'?<StructureReport session={session} onVisibility={reviewVisibility} onRetake={retake} onStyles={()=>navigate('hairstyles')} onCare={()=>navigate('care')} onDelete={startOver} favouriteIds={gallery.favourites} care={care}/>:section==='hairstyles'?<Hairstyles preferences={preferences} onPreferences={updatePreferences} gallery={gallery} onGallery={setGallery} analysis={session?.analysis.status==='ready'?session.analysis.value:undefined}/>:section==='care'?<Care choices={care} onChange={setCare} facialHair={preferences.facialHair} onStyles={()=>navigate('hairstyles')}/>:<Sections section={section} onStart={() => navigate('start')}/>}</Suspense></SectionBoundary>}</main><footer className="site-footer"><span className="footer-brand">FaceFrame.</span><span>Personal perspective. Honest limitations.</span><button className="text-link" onClick={startOver}>Start over / Delete current analysis</button></footer></>;
}


