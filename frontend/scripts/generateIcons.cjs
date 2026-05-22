const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.concat([t, data]);
  const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc32(crcBuf));
  return Buffer.concat([len, t, data, crcOut]);
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function createPNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  const cx = size / 2, cy = size / 2;
  const r = size * 0.46;
  const cr = size * 0.22; // corner radius for rounded rect

  // Gradient: top-left indigo to bottom-right violet
  const c1 = [99, 102, 241];   // indigo-500
  const c2 = [139, 92, 246];   // violet-500

  const raw = [];

  for (let y = 0; y < size; y++) {
    raw.push(0);
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const ax = Math.abs(dx), ay = Math.abs(dy);

      // Rounded rect check
      const inCorner = ax > r - cr && ay > r - cr;
      const cornerDist = Math.sqrt((ax - (r - cr)) ** 2 + (ay - (r - cr)) ** 2);
      const inBg = ax <= r && ay <= r && (!inCorner || cornerDist <= cr);

      if (!inBg) {
        // Transparent / white outside
        raw.push(255, 255, 255);
        continue;
      }

      // Gradient color based on position
      const t = (x + y) / (size * 2);
      const bgR = lerp(c1[0], c2[0], t);
      const bgG = lerp(c1[1], c2[1], t);
      const bgB = lerp(c1[2], c2[2], t);

      // Draw "ST" letters
      // Normalize coords to -1..1
      const nx = (x - cx) / (size * 0.5);
      const ny = (y - cy) / (size * 0.5);

      // "S" letter: left half, centered vertically
      // "T" letter: right half

      const inLetter = drawST(nx, ny, size);

      if (inLetter) {
        raw.push(255, 255, 255); // white letters
      } else {
        raw.push(bgR, bgG, bgB);
      }
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(raw));
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function drawST(nx, ny, size) {
  const thick = 0.09; // stroke thickness
  const gap = 0.04;   // gap between S and T

  // === S letter (left side) ===
  // S spans from nx: -0.52 to -0.06
  const sLeft = -0.52, sRight = -0.06;
  const sMid = (sLeft + sRight) / 2;
  const sW = (sRight - sLeft) / 2;

  // Top bar of S
  if (nx >= sLeft && nx <= sRight && ny >= -0.38 && ny <= -0.38 + thick) return true;
  // Middle bar of S
  if (nx >= sLeft && nx <= sRight && ny >= -0.04 && ny <= -0.04 + thick) return true;
  // Bottom bar of S
  if (nx >= sLeft && nx <= sRight && ny >= 0.29 && ny <= 0.29 + thick) return true;
  // Top-left vertical of S
  if (nx >= sLeft && nx <= sLeft + thick && ny >= -0.38 && ny <= -0.04) return true;
  // Bottom-right vertical of S
  if (nx >= sRight - thick && nx <= sRight && ny >= -0.04 && ny <= 0.29 + thick) return true;

  // === T letter (right side) ===
  // T spans from nx: 0.06 to 0.52
  const tLeft = 0.06, tRight = 0.52;
  const tMid = (tLeft + tRight) / 2;

  // Top bar of T
  if (nx >= tLeft && nx <= tRight && ny >= -0.38 && ny <= -0.38 + thick) return true;
  // Vertical stem of T (centered)
  if (nx >= tMid - thick / 2 && nx <= tMid + thick / 2 && ny >= -0.38 && ny <= 0.38) return true;

  return false;
}

const outDir = path.join(__dirname, '../public');
fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('Icons generated!');
