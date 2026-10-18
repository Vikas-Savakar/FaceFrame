// Test-only camera adapter. Call in the local app after showing an un-overlaid public test photo.
let source: HTMLCanvasElement | undefined;
let original: typeof navigator.mediaDevices.getUserMedia | undefined;
let resolvePending: ((value: MediaStream) => void) | undefined;
const tracks: MediaStreamTrack[] = [];
const timers: ReturnType<typeof setInterval>[] = [];
function createStream() {
  const stream=source!.captureStream(0);tracks.push(...stream.getTracks());
  const track=stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  timers.push(setInterval(()=>{if(track.readyState==='live'){source!.getContext('2d')!.drawImage(source!,0,0);track.requestFrame();}},100));
  return stream;
}
export function installCameraFixture(mode: 'immediate' | 'delayed' | 'denied' | 'missing' | 'busy' = 'immediate') {
  if (!original) original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  if (!source) {
    source = document.createElement('canvas');
    const visible = document.querySelector<HTMLCanvasElement>('.photo-view canvas');
    source.width = visible?.width || 640; source.height = visible?.height || 480;
    const context = source.getContext('2d')!;
    if (visible) context.drawImage(visible, 0, 0); else { context.fillStyle = '#888'; context.fillRect(0,0,source.width,source.height); }
  }
  navigator.mediaDevices.getUserMedia = async constraints => {
    if (constraints?.audio !== false) throw new Error('Camera requested audio');
    if (mode === 'denied' || mode === 'missing' || mode === 'busy') throw new DOMException('Test-only camera error', mode==='denied'?'NotAllowedError':mode==='missing'?'NotFoundError':'NotReadableError');
    if (mode === 'delayed') return new Promise<MediaStream>(resolve=>{resolvePending=resolve;});
    return createStream();
  };
  return 'Test-only getUserMedia adapter installed; real still preparation and detector remain active';
}
export function resolveLateCamera() {
  resolvePending?.(createStream());resolvePending=undefined;
}
export function cameraTrackStates() { return tracks.map(track=>track.readyState); }
export function restoreCamera() {
  tracks.forEach(track=>track.stop());tracks.length=0;
  timers.forEach(clearInterval);timers.length=0;
  if(original) navigator.mediaDevices.getUserMedia=original;
  original=undefined;if(source)source.width=source.height=0;source=undefined;
}
