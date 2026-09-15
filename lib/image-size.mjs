// Minimal JPEG/PNG dimension reader (no dependencies), for comparing the CDN
// render transform with the untransformed original.

export function imageSize(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8) return jpegSize(buffer);
  if (buffer.length > 24 && buffer[0] === 0x89 && buffer[1] === 0x50) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  return null;
}

function jpegSize(buffer) {
  let i = 2;
  while (i + 9 < buffer.length) {
    if (buffer[i] !== 0xff) { i++; continue; }
    const marker = buffer[i + 1];
    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15 carry the dimensions.
    const isSOF = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    const length = buffer.readUInt16BE(i + 2);
    if (isSOF) return { height: buffer.readUInt16BE(i + 5), width: buffer.readUInt16BE(i + 7) };
    i += 2 + length;
  }
  return null;
}
