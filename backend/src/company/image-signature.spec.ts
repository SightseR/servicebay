import { detectImage } from './image-signature';

describe('detectImage', () => {
  it('recognises PNG, JPEG and WebP by magic bytes', () => {
    expect(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]))).toBe('png');
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('jpeg');
    expect(detectImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]))).toBe('webp');
  });
  it('rejects SVG, text, and a PNG with a spoofed extension-only claim', () => {
    expect(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(detectImage(Buffer.from('hello'))).toBeNull();
    expect(detectImage(Buffer.alloc(0))).toBeNull();
  });
});
