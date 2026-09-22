/**
 * Validates an uploaded image by its magic bytes, not the client-supplied MIME type
 * (which is trivially spoofable). Only raster formats — SVG is deliberately excluded
 * because it can carry scripts.
 */
export type ImageKind = 'png' | 'jpeg' | 'webp';

export function detectImage(buf: Buffer): ImageKind | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export const EXTENSION: Record<ImageKind, string> = { png: 'png', jpeg: 'jpg', webp: 'webp' };
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
