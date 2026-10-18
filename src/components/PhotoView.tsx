import { useEffect, useRef, useState } from 'react';
import type { PhotoAsset } from '../contracts';
import type { DetectionOutput } from '../modules/detectionTypes';
export function PhotoView({ photo, output, mode }: { photo: PhotoAsset; output?: DetectionOutput; mode?: 'photo' | 'landmarks' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [show, setShow] = useState(true);
  const overlay = mode ? mode === 'landmarks' : show;
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const element = canvas.current!;
    setError(false);
    void createImageBitmap(photo.blob).then(bitmap => {
      try {
        if (cancelled) return;
        element.width = photo.dimensions.width; element.height = photo.dimensions.height;
        const ctx = element.getContext('2d'); if (!ctx) { setError(true); return; }
        ctx.drawImage(bitmap, 0, 0);
        if (overlay && output?.frame.status === 'ready' && output.frame.value.photoId === photo.id) {
          const points = output.frame.value.landmarks;
          ctx.strokeStyle = '#79ffcd'; ctx.lineWidth = Math.max(.8, element.width / 1000); ctx.beginPath();
          for (const edge of output.connections) {
            const a = points[edge.start], b = points[edge.end]; if (!a || !b) continue;
            ctx.moveTo(a.x * element.width, a.y * element.height); ctx.lineTo(b.x * element.width, b.y * element.height);
          }
          ctx.stroke(); ctx.fillStyle = '#fff6b5';
          for (const p of points) { ctx.beginPath(); ctx.arc(p.x * element.width, p.y * element.height, Math.max(.8, element.width / 900), 0, Math.PI * 2); ctx.fill(); }
        }
      } finally { bitmap.close(); }
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; element.width = element.height = 0; };
  }, [photo, output, overlay]);
  // Keep the canvas mounted on failure: a retry/overlay change must never dereference a removed ref.
  return <figure className="photo-view">{error && <p role="alert">The local image preview could not be drawn. Retry analysis or clear it and try another photo.</p>}<canvas ref={canvas} hidden={error} role="img" aria-label={output?.frame.status === 'ready' && overlay ? 'Your prepared photo with actual detected landmarks and face contour connections' : 'Your prepared, unmirrored photo'}/><figcaption>{photo.dimensions.width} × {photo.dimensions.height} px · Unmirrored prepared image{!mode && output?.frame.status === 'ready' && <label><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)}/> Show detected landmarks</label>}</figcaption></figure>;
}
