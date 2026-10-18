import type { PhotoAsset } from '../contracts';
import { inspectImage } from './imageMetadata.ts';
export const IMAGE_LIMITS = { bytes: 12 * 1024 * 1024, pixels: 24_000_000, dimension: 12_000, analysisEdge: 1280 } as const;
export async function prepareImage(blob: Blob, origin: PhotoAsset['origin']): Promise<PhotoAsset> {
  if (!blob.size || blob.size > IMAGE_LIMITS.bytes) throw new Error('Choose a nonempty image up to 12 MiB.');
  if (typeof createImageBitmap !== 'function') throw new Error('This browser cannot prepare local images. Try a current browser.');
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') throw new Error('Local photo preparation needs HTTPS or localhost in a current browser. Open FaceFrame there and choose your photo again.');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const meta = inspectImage(bytes);
  const { width, height, orientation } = meta;
  if (!width || !height || width * height > IMAGE_LIMITS.pixels || Math.max(width, height) > IMAGE_LIMITS.dimension) throw new Error('Image too large: maximum 24 megapixels and 12,000 pixels per side. Resize it first.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(new Blob([meta.cleanBytes as BlobPart], { type: meta.mime }), { imageOrientation: 'none' }); }
  catch { throw new Error('This image could not be decoded. Choose a valid JPEG, PNG or WebP image.'); }
  const canvas = document.createElement('canvas');
  try {
    if (bitmap.width !== width || bitmap.height !== height) throw new Error('Decoded dimensions do not match the header. Re-export this image.');
    const swap = orientation >= 5;
    const ow = swap ? height : width, oh = swap ? width : height;
    const scale = Math.min(1, IMAGE_LIMITS.analysisEdge / Math.max(ow, oh));
    canvas.width = Math.max(1, Math.round(ow * scale)); canvas.height = Math.max(1, Math.round(oh * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image preparation is unavailable in this browser.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / ow, canvas.height / oh);
    const matrices: Record<number, [number, number, number, number, number, number]> = {
      1: [1, 0, 0, 1, 0, 0], 2: [-1, 0, 0, 1, width, 0], 3: [-1, 0, 0, -1, width, height], 4: [1, 0, 0, -1, 0, height],
      5: [0, 1, 1, 0, 0, 0], 6: [0, 1, -1, 0, height, 0], 7: [0, -1, -1, 0, height, width], 8: [0, -1, 1, 0, 0, width],
    };
    ctx.transform(...matrices[orientation]); ctx.drawImage(bitmap, 0, 0);
    const prepared = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Could not prepare this image.')), 'image/png'));
    const dimensions = { width: canvas.width, height: canvas.height };
    return { id: crypto.randomUUID(), origin, blob: prepared, mimeType: 'image/png', dimensions, createdAt: new Date().toISOString(), transform: {
      original: { width, height }, prepared: dimensions, rotationDegrees: [0, 0, 0, 180, 180, 270, 90, 90, 270][orientation] as 0 | 90 | 180 | 270,
      orientation: { exif: orientation, reflectedBeforeRotation: [2, 4, 5, 7].includes(orientation), appliedBy: 'faceframe' },
      crop: null, mirrored: false, scale: { x: dimensions.width / ow, y: dimensions.height / oh },
    } };
  } finally { bitmap.close(); canvas.width = canvas.height = 0; }
}
