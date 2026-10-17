// Generates the PWA icons (no dependencies): node tools/make-icons.mjs
// Logo: three ascending "tiny steps" with a ball on top, on a teal gradient.
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Signed distance to a rounded rectangle centred at (cx, cy).
const rrect = (x, y, cx, cy, hw, hh, r) => {
  const qx = Math.abs(x - cx) - hw + r, qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const lerp = (a, b, t) => a + (b - a) * t;
const C1 = [34, 214, 160], C2 = [11, 140, 140], CORAL = [255, 122, 89];

function shade(u, v, mode) {
  // background
  let bg = null;
  if (mode !== 'badge') {
    const inside = mode === 'maskable' || mode === 'apple' || rrect(u, v, 0.5, 0.5, 0.5, 0.5, 0.22) <= 0;
    if (inside) {
      const t = (u + v) / 2;
      bg = [lerp(C1[0], C2[0], t), lerp(C1[1], C2[1], t), lerp(C1[2], C2[2], t), 255];
    }
  }
  // foreground, scaled into the safe zone for maskable icons
  const sc = mode === 'maskable' ? 0.72 : mode === 'badge' ? 1.05 : 0.9;
  const x = (u - 0.5) / sc + 0.5, y = (v - 0.5) / sc + 0.5;
  const base = 0.76, w = 0.15, gap = 0.055, x0 = 0.5 - (3 * w + 2 * gap) / 2;
  const heights = [0.2, 0.32, 0.44];
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (w + gap) + w / 2, h = heights[i];
    if (rrect(x, y, cx, base - h / 2, w / 2, h / 2, 0.035) <= 0) return [255, 255, 255, 255];
  }
  const bx = x0 + 2 * (w + gap) + w / 2, by = base - heights[2] - 0.11;
  if (Math.hypot(x - bx, y - by) <= 0.068) return mode === 'badge' ? [255, 255, 255, 255] : [...CORAL, 255];
  return bg || [0, 0, 0, 0];
}

function render(size, mode) {
  const SS = 4;
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const [cr, cg, cb, ca] = shade((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, mode);
        r += cr * ca; g += cg * ca; b += cb * ca; a += ca;
      }
      const o = (py * size + px) * 4;
      buf[o] = a ? r / a : 0; buf[o + 1] = a ? g / a : 0; buf[o + 2] = a ? b / a : 0; buf[o + 3] = a / (SS * SS);
    }
  }
  return png(size, buf);
}

const jobs = [
  ['icon-192.png', 192, 'any'], ['icon-512.png', 512, 'any'],
  ['maskable-192.png', 192, 'maskable'], ['maskable-512.png', 512, 'maskable'],
  ['apple-touch-icon.png', 180, 'apple'], ['badge-96.png', 96, 'badge'],
];
for (const [name, size, mode] of jobs) {
  fs.writeFileSync(path.join(OUT, name), render(size, mode));
  console.log('wrote', name);
}
