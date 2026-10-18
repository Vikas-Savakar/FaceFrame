/** Inspect dimensions before decoding; strip EXIF before applying orientation ourselves. */
export interface ImageMetadata { width: number; height: number; orientation: number; mime: string; cleanBytes: Uint8Array }
function tiffOrientation(bytes: Uint8Array): number {
  const offset = bytes[0] === 69 && bytes[1] === 120 ? 6 : 0;
  const data = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
  if (data.byteLength < 8) throw new Error('Invalid image orientation metadata.');
  const little = data.getUint16(0) === 0x4949;
  if ((!little && data.getUint16(0) !== 0x4d4d) || data.getUint16(2, little) !== 42) throw new Error('Invalid EXIF metadata.');
  const start = data.getUint32(4, little), count = data.getUint16(start, little);
  if (count > 4096 || start + 2 + count * 12 > data.byteLength) throw new Error('Invalid EXIF directory.');
  for (let i = 0; i < count; i++) {
    const pos = start + 2 + i * 12;
    if (data.getUint16(pos, little) === 0x112) {
      if (data.getUint16(pos + 2, little) !== 3 || data.getUint32(pos + 4, little) !== 1) throw new Error('Invalid orientation field.');
      const value = data.getUint16(pos + 8, little);
      if (value < 1 || value > 8) throw new Error('Unsupported orientation value.');
      return value;
    }
  }
  return 1;
}
function join(parts: Uint8Array[]) { const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0)); let offset = 0; for (const p of parts) { result.set(p, offset); offset += p.length; } return result; }
export function inspectImage(bytes: Uint8Array): ImageMetadata {
  try { return inspect(bytes); } catch (error) { if (error instanceof RangeError) throw new Error('Image header is incomplete or corrupt.'); throw error; }
}
function inspect(b: Uint8Array): ImageMetadata {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const ascii = (a: number, n: number) => String.fromCharCode(...b.subarray(a, a + n));
  let orientation = 1, seenOrientation = false;
  const readExif = (chunk: Uint8Array) => { if (seenOrientation) throw new Error('Conflicting EXIF metadata. Re-export the image.'); orientation = tiffOrientation(chunk); seenOrientation = true; };
  let width = 0, height = 0;
  if (b[0] === 0xff && b[1] === 0xd8) {
    let pos = 2; const parts = [b.subarray(0, 2)];
    while (pos < b.length) {
      const begin = pos;
      if (b[pos++] !== 0xff) throw new Error('Corrupt JPEG marker.');
      while (b[pos] === 0xff) pos++;
      const marker = b[pos++];
      if (marker === 0xda || marker === 0xd9) { parts.push(b.subarray(begin)); break; }
      const length = d.getUint16(pos);
      if (length < 2 || pos + length > b.length) throw new Error('Truncated JPEG image.');
      if (marker === 0xe1 && ascii(pos + 2, 6) === 'Exif\0\0') readExif(b.subarray(pos + 2, pos + length));
      else parts.push(b.subarray(begin, pos + length));
      if ([0xc0, 0xc1, 0xc2].includes(marker)) { height = d.getUint16(pos + 3); width = d.getUint16(pos + 5); }
      pos += length;
    }
    if (!width || !height) throw new Error('Unsupported or corrupt JPEG header. Use a standard JPEG.');
    return { width, height, orientation, mime: 'image/jpeg', cleanBytes: join(parts) };
  }
  if (b.length >= 24 && ascii(0, 8) === '\x89PNG\r\n\x1a\n') {
    if (ascii(12, 4) !== 'IHDR') throw new Error('Corrupt PNG header.');
    width = d.getUint32(16); height = d.getUint32(20);
    const parts = [b.subarray(0, 8)];
    for (let pos = 8; pos < b.length;) {
      const length = d.getUint32(pos), end = pos + 12 + length, name = ascii(pos + 4, 4);
      if (end > b.length || end <= pos) throw new Error('Truncated PNG image.');
      if (name === 'acTL') throw new Error('Choose a still PNG, not an animated image.');
      if (name === 'eXIf') readExif(b.subarray(pos + 8, end - 4)); else parts.push(b.subarray(pos, end));
      pos = end;
    }
    return { width, height, orientation, mime: 'image/png', cleanBytes: join(parts) };
  }
  if (b.length >= 20 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    if (d.getUint32(4, true) + 8 !== b.length) throw new Error('Corrupt WebP container.');
    const parts = [b.slice(0, 12)];
    for (let pos = 12; pos < b.length;) {
      const length = d.getUint32(pos + 4, true), end = pos + 8 + length + (length % 2), name = ascii(pos, 4), a = pos + 8;
      if (end > b.length || end <= pos) throw new Error('Truncated WebP image.');
      if (name === 'ANIM' || name === 'ANMF') throw new Error('Choose a still WebP, not an animated image.');
      if (name === 'EXIF') readExif(b.subarray(a, a + length));
      else {
        const chunk = b.slice(pos, end);
        if (name === 'VP8X') { width = 1 + b[a + 4] + (b[a + 5] << 8) + (b[a + 6] << 16); height = 1 + b[a + 7] + (b[a + 8] << 8) + (b[a + 9] << 16); chunk[8] &= ~8; }
        if (name === 'VP8 ' && !width) { width = d.getUint16(a + 6, true) & 0x3fff; height = d.getUint16(a + 8, true) & 0x3fff; }
        if (name === 'VP8L' && !width) { const bits = d.getUint32(a + 1, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
        parts.push(chunk);
      }
      pos = end;
    }
    const cleanBytes = join(parts); new DataView(cleanBytes.buffer).setUint32(4, cleanBytes.length - 8, true);
    return { width, height, orientation, mime: 'image/webp', cleanBytes };
  }
  throw new Error('Unsupported image. Choose a JPEG, PNG or WebP file; renaming another file will not convert it.');
}
