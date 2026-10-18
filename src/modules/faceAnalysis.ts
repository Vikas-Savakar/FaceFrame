import type { PhotoAsset } from '../contracts';
import type { WorkerInput, WorkerOutput, DetectionOutput } from './detectionTypes';
export class LocalFaceDetector {
  private worker: Worker;
  private pending?: { resolve: (result: WorkerOutput) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
  private disposed = false;
  constructor() {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') throw new Error('Local worker detection is not supported here. Use a current browser with Web Workers, OffscreenCanvas and ImageBitmap.');
    this.worker = new Worker(new URL('./face.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event: MessageEvent<WorkerOutput>) => {
      const pending = this.pending; if (!pending) return;
      clearTimeout(pending.timer); this.pending = undefined;
      if (event.data.type === 'error') pending.reject(new Error(event.data.stage === 'init' ? 'The local detector could not load. Retry loading, or try a current full browser. No photo was sent anywhere.' : 'Local analysis failed. Retry using CPU or choose another photo.'));
      else pending.resolve(event.data);
    };
    this.worker.onerror = event => { event.preventDefault(); this.fail('The local detector stopped unexpectedly. Retry loading it.'); };
    this.worker.onmessageerror = () => this.fail('The local detector could not read its result. Retry loading it.');
  }
  private fail(message: string) { const pending = this.pending; if (pending) { clearTimeout(pending.timer); this.pending = undefined; pending.reject(new Error(message)); } this.worker.terminate(); this.disposed = true; }
  private call(message: WorkerInput, transfer: Transferable[] = []) {
    if (this.disposed || this.pending) { if (message.type === 'detect') message.bitmap.close(); return Promise.reject(new Error('The detector is busy or closed. Retry loading it.')); }
    return new Promise<WorkerOutput>((resolve, reject) => {
      this.pending = { resolve, reject, timer: setTimeout(() => this.fail('Local detection timed out. Try CPU or a smaller photo.'), message.type === 'init' ? 60_000 : 30_000) };
      try { this.worker.postMessage(message, transfer); } catch { if (message.type === 'detect') message.bitmap.close(); this.fail('Could not start local detection. Try a current browser.'); }
    });
  }
  async initialize(delegate: 'GPU' | 'CPU' = 'GPU') {
    const result = await this.call({ type: 'init', base: new URL(import.meta.env.BASE_URL, location.href).href, delegate });
    if (result.type !== 'ready') throw new Error('Unexpected initialization response.');
    return result;
  }
  async detect(photo: PhotoAsset): Promise<DetectionOutput> {
    const bitmap = await createImageBitmap(photo.blob);
    const { blob: _blob, ...metadata } = photo;
    const result = await this.call({ type: 'detect', bitmap, photo: metadata }, [bitmap]);
    if (result.type !== 'result') throw new Error('Unexpected detection response.');
    return result.result;
  }
  dispose() { this.fail('Detection cancelled.'); }
}
