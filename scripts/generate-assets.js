/* eslint-disable */
/**
 * Jarvis — asset generator
 * ------------------------------------------------------------------
 * Creates the PNG assets referenced by app.json WITHOUT any external
 * dependency (uses Node's built-in `zlib` and a tiny hand-rolled PNG
 * encoder). Run with:  npm run assets
 *
 * Outputs into ./assets:
 *   icon.png           1024x1024  app icon
 *   adaptive-icon.png  1024x1024  Android adaptive foreground
 *   splash.png         1284x1284  splash logo
 *   favicon.png         96x96     web favicon
 *   og-image.png       1200x630   social preview
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = path.join(__dirname, '..', 'assets');
fs.mkdirSync(OUT, { recursive: true });

/* ----------------------------- PNG encoder ------------------------------ */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------- drawing -------------------------------- */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const mixColor = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];

const CYAN = [34, 225, 255];
const PURPLE = [139, 92, 246];
const BG_TOP = [8, 10, 26];
const BG_BOTTOM = [3, 4, 10];

/** Composite `src` over `dst` with alpha a (src is rgb premultiplied by a). */
function over(dst, i, rgb, a) {
  const ia = 1 - a;
  dst[i] = Math.round(rgb[0] * a + dst[i] * ia);
  dst[i + 1] = Math.round(rgb[1] * a + dst[i + 1] * ia);
  dst[i + 2] = Math.round(rgb[2] * a + dst[i + 2] * ia);
  dst[i + 3] = Math.round(255 * a + dst[i + 3] * ia);
}

/**
 * Render the Jarvis mark: a glowing orb with an orbital ring on a deep
 * space gradient. Pure math, no assets.
 */
function renderMark(size, opts) {
  const o = Object.assign({ transparentBg: false, scale: 1, glow: 1 }, opts || {});
  const buf = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.26 * o.scale;
  const ringR = size * 0.36 * o.scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = (x - cx) / size;
      const dy = (y - cy) / size;
      const d = Math.sqrt(dx * dx + dy * dy) * size; // px distance from centre

      // Background
      if (!o.transparentBg) {
        const bgT = clamp01(y / size);
        const bg = mixColor(BG_TOP, BG_BOTTOM, bgT);
        const vignette = 1 - 0.55 * clamp01(d / (size * 0.72));
        over(buf, i, [bg[0] * vignette, bg[1] * vignette, bg[2] * vignette], 1);
      }

      // Outer glow
      const glow = Math.pow(clamp01(1 - d / (R * 3.1)), 3) * 0.55 * o.glow;
      if (glow > 0.002) over(buf, i, mixColor(CYAN, PURPLE, clamp01(dy / 0.35 + 0.5)), glow);

      // Orbital ring
      const ring = 1 - smoothstep(0, size * 0.012, Math.abs(d - ringR));
      if (ring > 0.01) {
        const ang = Math.atan2(dy, dx);
        const tRing = clamp01(Math.sin(ang) * 0.5 + 0.5);
        over(buf, i, mixColor(CYAN, PURPLE, tRing), ring * 0.75 * o.glow);
      }

      // Orb body with a soft inner gradient
      const bodyA = 1 - smoothstep(R * 0.92, R * 1.02, d);
      if (bodyA > 0.004) {
        const ang = Math.atan2(dy, dx);
        const t = clamp01(Math.sin(ang + 0.6) * 0.5 + 0.5);
        let body = mixColor(CYAN, PURPLE, t);
        // bright core
        const core = Math.pow(clamp01(1 - d / (R * 0.55)), 2) * 0.85;
        body = mixColor(body, [235, 252, 255], core);
        // subtle rim darkening for depth
        const rim = Math.pow(clamp01(d / R), 6) * 0.35;
        body = mixColor(body, [10, 20, 40], rim);
        over(buf, i, body, bodyA);
      }
    }
  }
  return buf;
}

/* ------------------------------ write files ----------------------------- */
function write(name, size, opts) {
  const buf = renderMark(size, opts);
  const png = encodePNG(size, size, buf);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`  ✓ assets/${name}  (${size}x${size}, ${(png.length / 1024).toFixed(1)} KB)`);
}

console.log('Jarvis — generating assets…');
write('icon.png', 1024, { scale: 1.0 });
write('adaptive-icon.png', 1024, { transparentBg: true, scale: 0.72 });
write('splash.png', 1284, { scale: 0.85 });
write('favicon.png', 96, { scale: 1.05 });

// og-image (1200x630) — reuse the square mark, letterboxed onto a wide canvas
(function og() {
  const W = 1200;
  const H = 630;
  const discord = renderMark(H, { scale: 1.0 });
  const out = Buffer.alloc(W * H * 4, 0);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const t = clamp01(y / H);
      const bg = mixColor(BG_TOP, BG_BOTTOM, t);
      over(out, i, bg, 1);
      const sx = x - Math.floor((W - H) / 2);
      if (sx >= 0 && sx < H) {
        const si = (y * H + sx) * 4;
        const a = discord[si + 3] / 255;
        if (a > 0) over(out, i, [discord[si], discord[si + 1], discord[si + 2]], a * 0.95);
      }
    }
  }
  const png = encodePNG(W, H, out);
  fs.writeFileSync(path.join(OUT, 'og-image.png'), png);
  console.log(`  ✓ assets/og-image.png  (${W}x${H}, ${(png.length / 1024).toFixed(1)} KB)`);
})();

console.log('Done.');
