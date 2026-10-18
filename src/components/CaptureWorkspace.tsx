import { useEffect, useRef, useState } from 'react';
import type { PhotoAsset } from '../contracts';
import { requestCamera, stopCamera, captureStill } from '../modules/capture';
import { prepareImage } from '../modules/imagePreparation';
import { LocalFaceDetector } from '../modules/faceAnalysis';
import type { DetectionOutput } from '../modules/detectionTypes';
import { PhotoView } from './PhotoView';
type Stage = 'empty' | 'preparing' | 'loading' | 'ready' | 'analyzing' | 'done' | 'error';
export default function CaptureWorkspace({ onReport, initialPhoto, initialOutput, onResult, onInvalidate }: { onReport: () => void; initialPhoto?: PhotoAsset; initialOutput?: DetectionOutput; onResult: (photo: PhotoAsset, output: DetectionOutput) => void; onInvalidate: () => void }) {
  const [photo, setPhoto] = useState<PhotoAsset | undefined>(initialPhoto);
  const [output, setOutput] = useState<DetectionOutput | undefined>(initialOutput);
  const [stage, setStage] = useState<Stage>(initialOutput ? 'done' : 'empty');
  const [error, setError] = useState('');
  const [engine, setEngine] = useState('');
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraPending, setCameraPending] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const file = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null), detector = useRef<LocalFaceDetector | null>(null);
  const generation = useRef(0), cameraGeneration = useRef(0);
  function closeCamera() {
    cameraGeneration.current++; stopCamera(stream.current); stream.current = null;
    if (video.current) video.current.srcObject = null;
    setLiveStream(null);
    setCameraOpen(false); setCameraPending(false); setCameraReady(false); setCapturing(false);
  }
  function cancelAnalysis() { generation.current++; detector.current?.dispose(); detector.current = null; }
  function clearPhoto() {
    onInvalidate();
    cancelAnalysis(); closeCamera(); setPhoto(undefined); setOutput(undefined); setStage('empty'); setEngine(''); setError(''); setCameraMessage('');
    if (file.current) file.current.value = '';
  }
  useEffect(() => {
    const visibility = () => { if (document.hidden && (stream.current || video.current)) { closeCamera(); setCameraMessage('Camera stopped because the page was hidden. Start it again or upload a photo.'); } };
    const pageHide = () => {
      closeCamera(); cancelAnalysis();
      setEngine('');
      setCameraMessage('Camera is closed after leaving this page. Start it again or upload a photo.');
      setError(current => current || 'Local processing was interrupted when leaving the page. Retry analysis or choose a photo.');
      setStage(current => ['preparing','loading','analyzing','ready'].includes(current) ? 'error' : current);
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pageHide);
    return () => { document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pageHide); generation.current++; cameraGeneration.current++; stopCamera(stream.current); stream.current = null; detector.current?.dispose(); detector.current = null; };
  }, []);
  useEffect(() => {
    if (!liveStream || !cameraOpen || !video.current) return;
    const token = cameraGeneration.current, element = video.current;
    element.srcObject = liveStream;
    void element.play().then(() => {
      if (token !== cameraGeneration.current) return;
      setCameraPending(false); setCameraMessage('Preview is mirrored. The captured photo and analysis will be unmirrored.');
    }).catch(() => {
      if (token !== cameraGeneration.current) return;
      closeCamera(); setCameraMessage('The camera preview could not play here. Try a full browser or upload a photo.');
    });
    return () => { element.srcObject = null; };
  }, [liveStream, cameraOpen]);
  useEffect(()=>{
    if(stage==='error'||(stage==='done'&&output?.frame.status==='unavailable')){
      const title=document.getElementById('analysis-title');title?.focus({preventScroll:true});title?.scrollIntoView({block:'center'});
    }
  },[stage,output]);
  async function analyze(asset?: PhotoAsset, delegate: 'GPU' | 'CPU' = 'GPU', token = generation.current) {
    onInvalidate();
    detector.current?.dispose(); detector.current = null;
    setOutput(undefined); setError(''); setStage('loading'); setEngine('');
    try {
      const client = new LocalFaceDetector(); detector.current = client;
      const ready = await client.initialize(delegate);
      if (token !== generation.current) return;
      setEngine(`${ready.delegate} worker${ready.fallback ? ' · GPU unavailable; CPU fallback active' : ''}`); setStage('ready');
      if (!asset) return;
      setStage('analyzing');
      const result = await client.detect(asset);
      if (token !== generation.current) return;
      setOutput(result); setStage('done'); onResult(asset, result);
    } catch (reason) {
      if (token !== generation.current) return;
      detector.current?.dispose(); detector.current = null;
      setError(reason instanceof Error ? reason.message : 'Local analysis failed. Retry loading the detector.'); setStage('error');
    }
  }
  async function accept(blob: Blob, origin: PhotoAsset['origin']) {
    onInvalidate();
    cancelAnalysis(); const token = generation.current;
    closeCamera(); setPhoto(undefined); setOutput(undefined); setError(''); setEngine(''); setCameraMessage(''); setStage('preparing');
    try {
      const asset = await prepareImage(blob, origin);
      if (token !== generation.current) return;
      setPhoto(asset); await analyze(asset, 'GPU', token);
    } catch (reason) { if (token === generation.current) { setError(reason instanceof Error ? reason.message : 'Could not prepare this image.'); setStage('error'); } }
  }
  async function startCamera() {
    clearPhoto(); const token = cameraGeneration.current;
    setCameraOpen(true); setCameraPending(true); setCameraMessage('Requesting camera permission…');
    try {
      const next = await requestCamera();
      if (token !== cameraGeneration.current) { stopCamera(next); return; }
      stream.current = next; setLiveStream(next);
      for (const track of next.getVideoTracks()) track.onended = () => { if (token === cameraGeneration.current) { closeCamera(); setCameraMessage('The camera disconnected. Start it again or upload a photo.'); } };
    } catch (reason) {
      if (token !== cameraGeneration.current) return;
      closeCamera(); setCameraMessage(reason instanceof Error ? reason.message : 'Camera unavailable. Upload a photo instead.');
    }
  }
  async function capture() {
    if (!video.current || capturing) return;
    const token = cameraGeneration.current; setCapturing(true);
    try {
      const still = await captureStill(video.current);
      if (token !== cameraGeneration.current) return;
      // Stop before decoding, model loading or inference.
      closeCamera(); await accept(still, 'camera-still');
    } catch (reason) { if (token === cameraGeneration.current) { closeCamera(); setCameraMessage(reason instanceof Error ? reason.message : 'Capture failed. Try again.'); } }
  }
  const busy = stage === 'preparing' || stage === 'loading' || stage === 'analyzing';
  const titles: Record<Stage, string> = { empty: 'No photo selected', preparing: 'Preparing your image locally', loading: 'Loading the local detector', ready: 'Local detector ready', analyzing: 'Analyzing this still image locally', done: output?.frame.status === 'ready' ? 'Landmarks detected' : 'Another photo is needed', error: 'Could not complete this step' };
  return <>
    <section className="start-area" id="workspace" aria-labelledby="workspace-title"><div className="section-heading"><div><p className="eyebrow">ADD YOUR PHOTO</p><h2 id="workspace-title">One photo. A fresh perspective.</h2></div><span className="phase-label">JPG, PNG or WebP</span></div>
    <div className="workspace-grid"><div className={`capture-card ${dragging ? 'dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); const files = event.dataTransfer.files; if (files.length !== 1) { clearPhoto(); setError('Drop exactly one image at a time.'); setStage('error'); } else void accept(files[0], 'upload'); }}>
      <span className="capture-mark" aria-hidden="true">↑</span><h3>Drop your photo here</h3><p>One face, looking straight ahead.<br/>Choose a photo or take a camera still.</p>
      <input ref={file} className="visually-hidden" type="file" aria-label="Choose JPEG, PNG or WebP photo" accept="image/jpeg,image/png,image/webp" onChange={event => { const selected = event.target.files?.[0]; event.target.value = ''; if (selected) void accept(selected, 'upload'); }}/>
      <div className="capture-actions"><button className="button" onClick={() => file.current?.click()}>Upload a photo</button><button className="button secondary" onClick={() => void startCamera()} disabled={cameraOpen}>Start camera</button></div>
      <p className="capture-progress" role="status">{busy?titles[stage]:''}</p><p className="capture-limit">JPEG, PNG, WebP · Up to 12 MiB / 24 MP / 12,000 px per side</p><details className="capture-help"><summary>Photo limits & camera help</summary><p className="capture-limit">Still images only · Prepared to a maximum 1280 px edge. Camera requires HTTPS or localhost. If this preview restricts it, open the site directly or upload instead.</p></details>
      {cameraOpen && <div className="camera-panel"><video ref={video} autoPlay muted playsInline onLoadedData={() => setCameraReady(true)} aria-label="Mirrored live camera preview"/><div className="capture-actions"><button className="button" onClick={() => void capture()} disabled={!cameraReady || cameraPending || capturing}>{capturing ? 'Capturing…' : 'Capture'}</button><button className="button secondary" onClick={() => { closeCamera(); setCameraMessage('Camera closed. No camera is active.'); }}>Close camera</button></div></div>}
      {cameraMessage && <p className="camera-message" role="status">{cameraMessage}</p>}

    </div><aside className="guidance" aria-labelledby="guidance-title"><p className="eyebrow">A BETTER START</p><h3 id="guidance-title">A photo that works well</h3><ol><li><span>01</span><div><h4>Face forward at eye level</h4><p>Keep your head level and use a neutral expression. Avoid close wide-angle selfies; step back a little.</p></div></li><li><span>02</span><div><h4>Find soft, even light</h4><p>Face a window and avoid strong shadows or backlighting.</p></div></li><li><span>03</span><div><h4>Keep your full face visible</h4><p>Leave space around your face, move hair aside and remove sunglasses. Avoid beauty filters.</p></div></li></ol><p className="guidance-note">Automated size, framing, blur and pose checks are approximate and fallible. There is no skin-tone or lighting pass/fail test.</p></aside></div></section>
    <details className="analysis-area" aria-busy={busy} open={stage!=='empty'}><summary>{stage==='empty'?'Advanced detector tools':'Analysis status & photo'}</summary><div aria-labelledby="analysis-title"><div className="analysis-top"><div><p className="eyebrow">YOUR ANALYSIS WORKSPACE</p><h2 id="analysis-title" tabIndex={-1}>Your photo, processed here.</h2></div><span className="empty-pill">{engine || 'Local processing only'}</span></div>
      <div className="analysis-status" role="status" aria-live="polite">{busy && <span className="spinner" aria-hidden="true"/>}<h3>{titles[stage]}</h3>{stage === 'error' && error && <p role="alert">{error}</p>}{output?.frame.status === 'unavailable' && <p>{output.frame.reason.message}</p>}{output?.frame.status === 'ready' && <p>Exactly one face detected · {output.frame.value.landmarks.length} actual model landmarks. Points and contours are estimates, not physical depth or bone structure.</p>}{stage === 'empty' && <p>Upload a photo or take a camera still. You can also load the detector first.</p>}{stage === 'loading' && <p>Loading the model and matching runtime from this site. No photo is uploaded.</p>}</div>
      {photo && <PhotoView key={photo.id} photo={photo} output={output}/>}
      {output && output.checks.length > 0 && <ul className="quality-list" aria-label="Approximate photo checks">{output.checks.map(check => <li key={check.id}><strong>{check.label}</strong><span>{check.outcome.status === 'ready' ? check.outcome.value === 'pass' ? 'No issue flagged' : check.outcome.value === 'fail' ? 'Retake suggested' : 'Caution' : 'Unavailable'}</span>{check.outcome.status === 'ready' && check.outcome.value !== 'pass' && <p>{check.explanation}</p>}</li>)}</ul>}
      <div className="analysis-actions">{!busy && <button className="button secondary" onClick={() => { cancelAnalysis(); void analyze(photo, 'GPU'); }}>{photo ? 'Retry analysis' : 'Load local detector'}</button>}{(stage === 'error' || photo) && !busy && <button className="button secondary" onClick={() => { cancelAnalysis(); void analyze(photo, 'CPU'); }}>Retry using CPU</button>}{photo?.origin === 'camera-still' && <button className="button secondary" onClick={() => void startCamera()}>Retake</button>}<button className="button secondary" onClick={clearPhoto}>Clear photo / reset</button></div>
      <p className="analysis-note">Checks can miss problems or reject usable photos. Only detected single faces that pass the implemented checks get an overlay. No result confidence is supplied by this API. Open your structure report to inspect the calculated proportions, visibility limits and estimated mesh.</p>
      <div className="workspace-footer"><span>MediaPipe 1.1.1 · IMAGE mode · No server photo processing</span><button className="text-link" onClick={onReport}>View my results <span aria-hidden="true">↗</span></button></div>
    </div></details>
  </>;
}

