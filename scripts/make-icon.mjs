#!/usr/bin/env node
/**
 * Generates assets/images/icon.png (1024x1024, RGBA) for the app icon and splash screen.
 *
 * Why a script instead of a committed PNG: the repository stays plain text, the icon can
 * be reviewed in a diff, and every build (local, GitHub Actions, EAS) produces exactly the
 * same bytes. No dependencies — only Node's built-in zlib.
 *
 *   node scripts/make-icon.mjs
 *
 * Runs automatically through `postinstall`, so `npx expo prebuild` always finds the file.
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 1024;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images', 'icon.png');

/* ------------------------------------------------------------------ drawing */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Signed distance to a rounded rectangle, negative inside. */
function roundedRectDistance(x, y, cx, cy, width, height, radius) {
  const dx = Math.abs(x - cx) - (width / 2 - radius);
  const dy = Math.abs(y - cy) - (height / 2 - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside + Math.min(Math.max(dx, dy), 0) - radius;
}

function mix(a, b, t) {
  const k = clamp01(t);
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/** Source-over compositing of a colour with coverage `alpha` onto `dst`. */
function blend(dst, colour, alpha) {
  const a = clamp01(alpha);
  dst[0] = dst[0] * (1 - a) + colour[0] * a;
  dst[1] = dst[1] * (1 - a) + colour[1] * a;
  dst[2] = dst[2] * (1 - a) + colour[2] * a;
}

const NAVY_DARK = [8, 12, 26];
const NAVY_MID = [16, 26, 51];
const BOARD_FILL = [11, 18, 38];
const CYAN = [34, 211, 238];
const CYAN_DIM = [14, 116, 144];

function render() {
  const pixels = Buffer.alloc(SIZE * SIZE * 4);
  const centre = SIZE / 2;
  const boardW = SIZE * 0.72;
  const boardH = boardW * (9 / 16);
  const radius = SIZE * 0.028;

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Background: a soft vertical gradient plus a cyan glow behind the board.
      let colour = mix(NAVY_DARK, NAVY_MID, py / SIZE);
      const radial = Math.hypot(px - centre, py - centre * 0.94) / (SIZE * 0.62);
      colour = mix(colour, [22, 44, 74], Math.max(0, 1 - radial) * 0.7);

      const boardDistance = roundedRectDistance(px, py, centre, centre, boardW, boardH, radius);

      // The board: dark surface, faint grid, glowing cyan bezel.
      const inside = clamp01(0.5 - boardDistance);
      if (inside > 0) {
        let surface = BOARD_FILL;
        const cell = SIZE * 0.06;
        const gx = Math.abs(((px + cell / 2) % cell) - cell / 2);
        const gy = Math.abs(((py + cell / 2) % cell) - cell / 2);
        const grid = Math.max(clamp01((1.2 - gx) / 1.2), clamp01((1.2 - gy) / 1.2)) * 0.16;
        surface = mix(surface, CYAN, grid);
        // Slight top-to-bottom lift so the surface does not read as a flat block.
        surface = mix(surface, [18, 30, 58], (py - (centre - boardH / 2)) / boardH * 0.5);
        blend(colour, surface, inside);
      }

      // Glow around the bezel, falling off with distance.
      const glow = Math.exp(-Math.abs(boardDistance) / (SIZE * 0.022)) * 0.85;
      blend(colour, CYAN, glow * 0.45);

      // Bezel line itself.
      const line = clamp01(1 - Math.abs(boardDistance) / (SIZE * 0.0045));
      blend(colour, CYAN, line);

      // Inner accent: a short cyan bar suggesting content on the screen.
      const barW = boardW * 0.42;
      const barH = SIZE * 0.012;
      const barDistance = roundedRectDistance(
        px,
        py,
        centre,
        centre + boardH * 0.16,
        barW,
        barH,
        barH / 2,
      );
      blend(colour, CYAN_DIM, clamp01(0.5 - barDistance));

      const index = (y * SIZE + x) * 4;
      pixels[index] = Math.round(colour[0]);
      pixels[index + 1] = Math.round(colour[1]);
      pixels[index + 2] = Math.round(colour[2]);
      pixels[index + 3] = 255;
    }
  }
  return pixels;
}

/* ------------------------------------------------------------- PNG encoding */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePNG(pixels, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  header[10] = 0; // deflate
  header[11] = 0; // adaptive filtering
  header[12] = 0; // no interlacing

  // Each scanline is prefixed with its filter type (0 = none).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------- write */

const png = encodePNG(render(), SIZE, SIZE);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, png);

const shown = OUT.split(/[\\/]/).slice(-3).join('/');
console.log(`${shown} — ${SIZE}x${SIZE}, ${(png.length / 1024).toFixed(1)} kB`);
void relative;
