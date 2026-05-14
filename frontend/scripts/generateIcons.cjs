// Simple PNG generator without external deps
// Creates a solid colored square PNG

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    let crc = 0xffffffff;
    for (const b of crcBuf) {
      crc ^= b;
      for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    crc ^= 0xffffffff;
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, crcOut]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Image data - solid color with rounded feel
  const raw = [];
  for (let y = 0; y < size; y++) {
    raw.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const cx = x - size / 2, cy = y - size / 2;
      const radius = size * 0.45;
      const cornerR = size * 0.2;
      // rounded rect check
      const ax = Math.abs(cx), ay = Math.abs(cy);
      const inCorner = ax > radius - cornerR && ay > radius - cornerR;
      const dist = Math.sqrt((ax - (radius - cornerR)) ** 2 + (ay - (radius - cornerR)) ** 2);
      const inside = !inCorner || dist <= cornerR;
      if (inside && ax <= radius && ay <= radius) {
        raw.push(r, g, b);
      } else {
        raw.push(245, 246, 250); // bg color
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '../public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192, 79, 70, 229));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512, 79, 70, 229));
console.log('Icons generated successfully!');
