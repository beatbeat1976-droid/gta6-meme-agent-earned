// GTA 6 meme entry for make.fun bounty "Post a GTA 6 meme on X" (gta6-meme-x-01).
//
// What this program does (Node 22+, standard library only, no network):
//   1. Deterministically renders the meme picture, meme.png (1200x675), from scratch:
//      a two-panel "loading screen" joke drawn with code only — no GTA artwork,
//      no external image assets. The make.fun ghost mascot is drawn in code
//      (white ghost, thick black outline, black sparkle eyes, magenta coin).
//        Top panel:    "WAITED 13 YEARS FOR GTA 6" — a player silhouette at sunset.
//        Bottom panel: "MY AI AGENT EARNED ON MAKE.FUN" — the ghost holding a USDC bag.
//        Corner tag:   "WASTED > PAID"
//   2. Copies POST.json from the repository root to the output directory
//      (the make.fun gate reads /output/POST.json), and writes meme.png there too.
//
// Run locally:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
// With no env vars it writes meme.png + POST.json into /output (the grader's layout),
// falling back to ./out when /output cannot be created.

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// Tiny RGB canvas + PNG encoder (standard library only)
// ---------------------------------------------------------------------------

const W = 1200;
const H = 675;

type RGB = [number, number, number];
const buf = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, [r, g, b]: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
}

function fillRect(x0: number, y0: number, w: number, h: number, c: RGB): void {
  for (let y = Math.max(0, y0); y < Math.min(H, y0 + h); y++)
    for (let x = Math.max(0, x0); x < Math.min(W, x0 + w); x++) setPx(x, y, c);
}

function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++)
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPx(x, y, c);
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c);
    }
}

// Vertical gradient between two colours, t in [0,1] per row of the band.
function gradientBand(y0: number, y1: number, top: RGB, bottom: RGB): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1);
    const c: RGB = [
      Math.round(top[0] + (bottom[0] - top[0]) * t),
      Math.round(top[1] + (bottom[1] - top[1]) * t),
      Math.round(top[2] + (bottom[2] - top[2]) * t),
    ];
    fillRect(0, y, W, 1, c);
  }
}

// A four-point sparkle (the ghost's eyes, the coin's star), centred at (cx, cy).
function sparkle(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = Math.abs(x - cx) / rx, dy = Math.abs(y - cy) / ry;
      if (dx + dy <= 1 || (dx < 0.28 && dy < 0.28)) setPx(x, y, c);
    }
}

// ---------------------------------------------------------------------------
// 5x7 bitmap font — only the glyphs the meme uses
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '$': ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

// Draw text with a 1-scale-pixel shadow/outline pass for readability.
function drawText(text: string, cx: number, y: number, scale: number, c: RGB, outline?: RGB): void {
  const x0 = Math.round(cx - textWidth(text, scale) / 2);
  const draw = (dx: number, dy: number, col: RGB) => {
    let x = x0 + dx;
    for (const ch of text.toUpperCase()) {
      const glyph = FONT[ch] ?? FONT[' '];
      for (let row = 0; row < 7; row++)
        for (let colI = 0; colI < 5; colI++)
          if (glyph[row][colI] === '1') fillRect(x + colI * scale, y + dy + row * scale, scale, scale, col);
      x += 6 * scale;
    }
  };
  if (outline) {
    for (const [dx, dy] of [[-scale, 0], [scale, 0], [0, -scale], [0, scale], [-scale, -scale], [scale, scale], [-scale, scale], [scale, -scale]])
      draw(dx, dy, outline);
  }
  draw(0, 0, c);
}

// ---------------------------------------------------------------------------
// Scene drawing
// ---------------------------------------------------------------------------

const BLACK: RGB = [10, 10, 16];
const WHITE: RGB = [255, 255, 255];
const MAGENTA: RGB = [255, 45, 149];
const GOLD: RGB = [255, 205, 40];
const TEAL: RGB = [20, 220, 200];

// --- Top panel: sunset over a "loading screen" (0..337) ---
gradientBand(0, 338, [58, 16, 92], [255, 110, 64]); // purple -> sunset orange
fillCircle(1022, 262, 52, [255, 170, 80]); // low sun near the horizon
fillCircle(1022, 262, 40, [255, 224, 110]);
// Palm silhouettes (simple): trunk + fronds as thick lines of ellipses
function palm(x: number, baseY: number, h: number): void {
  for (let i = 0; i < h; i++) fillRect(x + Math.round(Math.sin(i / 18) * 6), baseY - i, 7, 2, BLACK);
  const tx = x + Math.round(Math.sin(h / 18) * 6), ty = baseY - h;
  for (const a of [-0.9, -0.45, 0, 0.45, 0.9])
    for (let i = 0; i < 46; i++)
      fillCircle(Math.round(tx + Math.sin(a) * i), Math.round(ty - Math.cos(a) * i * 0.35 + i * i * 0.012), 4, BLACK);
}
palm(90, 338, 150);
palm(1090, 338, 120);
// Ground line
fillRect(0, 322, W, 16, BLACK);

// Player silhouette: head, body, arms holding a controller
fillCircle(300, 205, 30, BLACK); // head
fillRect(272, 232, 56, 90, BLACK); // torso
fillEllipse(238, 268, 34, 13, BLACK); // left arm
fillEllipse(362, 268, 34, 13, BLACK); // right arm
fillRect(272, 258, 56, 26, [24, 24, 34]); // controller body (slightly lighter)
fillCircle(284, 271, 4, MAGENTA);
fillCircle(316, 271, 4, TEAL);
// Speech-less caption, top panel
drawText('WAITED 13 YEARS', 660, 84, 9, WHITE, BLACK);
drawText('FOR GTA 6', 660, 176, 9, GOLD, BLACK);
// Loading bar that never finished
fillRect(470, 268, 380, 16, BLACK);
fillRect(474, 272, 300, 8, [120, 120, 130]);
drawText('LOADING... 99 OF 100', 660, 292, 3, WHITE, BLACK);

// --- Divider ---
fillRect(0, 338, W, 6, BLACK);

// --- Bottom panel: neon night, the agent ghost at work (344..675) ---
gradientBand(344, H, [8, 10, 38], [16, 60, 66]);
// Stars
for (let i = 0; i < 60; i++) {
  const x = (i * 197) % W, y = 352 + ((i * 89) % 120);
  fillRect(x, y, 3, 3, [200, 220, 255]);
}
// Money bag beside the captions
fillEllipse(1092, 578, 46, 50, GOLD);
fillRect(1072, 516, 40, 16, [214, 164, 20]);
drawText('$', 1092, 552, 6, BLACK);

// The make.fun ghost mascot, drawn in code: black outline pass, then white body.
function ghost(cx: number, topY: number, s: number, outline: boolean): void {
  const c: RGB = outline ? BLACK : WHITE;
  const w2 = 74 * s, headR = 74 * s, bodyH = 96 * s;
  fillCircle(cx, topY + headR, headR + (outline ? 7 : 0), c); // round head
  fillRect(cx - w2 - (outline ? 7 : 0), topY + headR, (w2 + (outline ? 7 : 0)) * 2, bodyH, c); // body
  // Wavy bottom: three scallops
  for (let i = -1; i <= 1; i++)
    fillCircle(cx + i * (w2 * 0.62), topY + headR + bodyH, 24 * s + (outline ? 5 : 0), c);
}
ghost(215, 392, 1, true);
ghost(215, 392, 1, false);
// Cover the scallop gaps back to background is unnecessary: scallops sit on the bag side.
// Sparkle eyes + little round hand, per the make.fun mark
sparkle(187, 452, 11, 17, BLACK);
sparkle(245, 452, 11, 17, BLACK);
fillCircle(297, 520, 17, BLACK); // hand outline
fillCircle(297, 520, 12, WHITE); // hand
// Magenta coin with a white star, held by the ghost
fillCircle(335, 486, 34, BLACK);
fillCircle(335, 486, 29, MAGENTA);
sparkle(335, 486, 13, 13, WHITE);
// "make.fun" wordmark in the scene
drawText('MAKE.FUN', 215, 636, 4, MAGENTA, BLACK);

// Bottom caption
drawText('MY AI AGENT EARNED', 735, 398, 7, WHITE, BLACK);
drawText('ON MAKE.FUN', 735, 478, 8, TEAL, BLACK);
drawText('WHILE I WAS STILL WAITING', 735, 560, 4, [230, 230, 240], BLACK);

// Corner tag
drawText('WASTED > PAID', 1032, 22, 3, GOLD, BLACK);

// ---------------------------------------------------------------------------
// PNG encoding (IHDR/IDAT/IEND, filter 0 rows)
// ---------------------------------------------------------------------------

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(): Uint8Array {
  const raw = new Uint8Array(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, W); dv.setUint32(4, H);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const parts = [sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { png.set(p, off); off += p.length; }
  return png;
}

// ---------------------------------------------------------------------------
// Output: meme.png + POST.json
// ---------------------------------------------------------------------------

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '.';
let OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch {
  OUTPUT_DIR = join(BOT_DIR, 'out');
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

writeFileSync(join(OUTPUT_DIR, 'meme.png'), encodePng());
try {
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
console.log(`wrote ${join(OUTPUT_DIR, 'meme.png')} and ${join(OUTPUT_DIR, 'POST.json')}`);
