/** Only the verified bundled catalog has derivatives. Original sources/exports retain the PNGs. */
export function referencePreview(url:string):string {
  return /^\/hairstyles\/[a-z-]+\.png$/.test(url) ? url.replace('/hairstyles/','/hairstyles/previews/').replace(/\.png$/,'.webp') : url;
}
export const PREVIEW_MODIFICATION='Gallery previews: resized to a 768-pixel edge and encoded as WebP; original PNG retained unchanged.';
