export function stopCamera(stream: MediaStream | null) { stream?.getTracks().forEach(track => track.stop()); }
export function cameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied or this embedded preview restricts access. Open FaceFrame directly over HTTPS or localhost, allow camera access, or upload a photo.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No usable camera was found. Connect a camera or upload a photo.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'The camera could not start. It may be in use by another app. Close that app and retry, or upload a photo.';
  return 'Camera access is unavailable here. Use HTTPS or localhost in a full browser, or upload a photo.';
}
export async function requestCamera(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost and a supported browser. Embedded previews may block it. Upload a photo instead.');
  try { return await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } } }); }
  catch (error) { throw new Error(cameraError(error)); }
}
export async function captureStill(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < 2 || !video.videoWidth) throw new Error('Wait until the camera preview is ready before capturing.');
  const canvas = document.createElement('canvas');
  if (video.videoWidth * video.videoHeight > 24_000_000 || Math.max(video.videoWidth, video.videoHeight) > 12_000) throw new Error('Camera resolution is too large. Use another camera or upload a resized photo.');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  try {
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Still capture is not supported. Upload a photo instead.');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Capture failed. Try again or upload a photo.')), 'image/png'));
  } finally { canvas.width = canvas.height = 0; }
}
