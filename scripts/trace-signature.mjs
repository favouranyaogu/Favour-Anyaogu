#!/usr/bin/env node
/**
 * Digitises a photo of the handwritten signature into vector outlines.
 *
 *   node scripts/trace-signature.mjs [source.png]
 *
 * Reads a PNG of dark ink on light paper, isolates the ink by colour, traces
 * the outline of every stroke (outer edges *and* the holes inside letters) with
 * marching squares, simplifies the loops, and writes:
 *
 *   public/signature.svg     — the mark itself (favicon, OG cards, any <img>)
 *   lib/signature-path.ts    — the same path data for the inline header mark
 *   .freebuff/handwriting/compare.html — source vs trace, for eyeballing
 *
 * Then it rasterises its own output through headless Chrome and reports the
 * IoU against the original ink mask, so a bad trace is visible as a number
 * rather than a surprise.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ARGS = process.argv.slice(2);
const FLAGS = ARGS.filter((arg) => arg.startsWith('--'));
const SOURCE = ARGS.find((arg) => !arg.startsWith('--'))
  ? path.resolve(ARGS.find((arg) => !arg.startsWith('--')))
  : path.join(ROOT, '.freebuff', 'handwriting', 'source.png');
const OUT_SVG = path.join(ROOT, 'public', 'signature.svg');
const OUT_TS = path.join(ROOT, 'lib', 'signature-path.ts');
const WORK = path.join(ROOT, '.freebuff', 'handwriting');

/** Ink is blue-biased and darker than the paper; the card edge and shadows are neutral. */
const MIN_BLUENESS = 15;
const MIN_COMPONENT_AREA = 8;
const SIMPLIFY_TOLERANCE = 0.6;
/** Ink dilation in source pixels, to hold the pen weight at display size. */
const GROW = 2;
/** Height to trace at — roughly 8× the largest size the mark is used at. */
const TARGET_HEIGHT = 220;

// ---------------------------------------------------------------- PNG decode

function unfilter(type, line, prev, bpp) {
  const n = line.length;
  switch (type) {
    case 0:
      break;
    case 1:
      for (let i = bpp; i < n; i++) line[i] = (line[i] + line[i - bpp]) & 255;
      break;
    case 2:
      for (let i = 0; i < n; i++) line[i] = (line[i] + prev[i]) & 255;
      break;
    case 3:
      for (let i = 0; i < n; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255;
      }
      break;
    case 4:
      for (let i = 0; i < n; i++) {
        const a = i >= bpp ? line[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
      }
      break;
    default:
      throw new Error(`unsupported PNG filter ${type}`);
  }
}

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (pos + 8 <= buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const chunk = buf.subarray(pos + 8, pos + 8 + length);

    if (type === 'IHDR') {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      interlace = chunk[12];
    } else if (type === 'IDAT') {
      idat.push(chunk);
    } else if (type === 'IEND') {
      break;
    }

    pos += 8 + length + 4;
  }

  if (bitDepth !== 8) throw new Error(`only 8-bit PNGs are supported (got ${bitDepth})`);
  if (interlace) throw new Error('interlaced PNGs are not supported');

  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported PNG colour type ${colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride));
    unfilter(filter, line, prev, channels);

    for (let x = 0; x < width; x++) {
      const s = x * channels;
      const d = (y * width + x) * 4;
      if (channels === 1 || channels === 2) {
        out[d] = out[d + 1] = out[d + 2] = line[s];
        out[d + 3] = channels === 2 ? line[s + 1] : 255;
      } else {
        out[d] = line[s];
        out[d + 1] = line[s + 1];
        out[d + 2] = line[s + 2];
        out[d + 3] = channels === 4 ? line[s + 3] : 255;
      }
    }

    prev = line;
  }

  return { width, height, data: out };
}

// ------------------------------------------------------------------- masking

function buildMask({ width, height, data }) {
  const mask = new Uint8Array(width * height);
  let blueStats = 0;
  let ink = 0;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const blueness = b - (r + g) / 2;
    if (blueness > blueStats) blueStats = blueness;
    if (blueness >= MIN_BLUENESS) {
      mask[i] = 1;
      ink += 1;
    }
  }

  return { mask, ink, maxBlueness: blueStats };
}

/** Drop specks (dust, JPEG-ish noise) that would trace as stray loops. */
function removeSpecks(mask, width, height) {
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let removed = 0;

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;

    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const component = [];

    while (top > 0) {
      const index = stack[--top];
      component.push(index);
      const x = index % width;
      const y = (index - x) / width;

      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const n = ny * width + nx;
        if (mask[n] && !seen[n]) {
          seen[n] = 1;
          stack[top++] = n;
        }
      }
    }

    if (component.length < MIN_COMPONENT_AREA) {
      for (const index of component) mask[index] = 0;
      removed += component.length;
    }
  }

  return removed;
}

function inkBounds(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  return { minX, minY, maxX, maxY };
}

// -------------------------------------------------------------- conditioning

/**
 * Dilate the ink by `radius` pixels.
 *
 * The photo resolves a ~14px stroke over 743px of paper. At the size the mark
 * is actually used (~28px tall) that is a sub-pixel hairline, which browsers
 * render as faint grey. Growing the ink keeps the signature legible and solid
 * at display size without turning it into a chunky fill.
 */
function growMask(mask, width, height, radius) {
  if (radius < 1) return mask;
  const grown = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          grown[ny * width + nx] = 1;
        }
      }
    }
  }

  return grown;
}

/** Area-majority downscale — smoother than sampling, and keeps thin strokes. */
function downscale(mask, width, height, factor, outWidth, outHeight) {
  if (factor <= 1) return mask;
  const out = new Uint8Array(outWidth * outHeight);
  const threshold = factor * factor * 0.45;

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      let on = 0;
      for (let sy = y * factor; sy < Math.min((y + 1) * factor, height); sy++) {
        for (let sx = x * factor; sx < Math.min((x + 1) * factor, width); sx++) {
          on += mask[sy * width + sx];
        }
      }
      if (on >= threshold) out[y * outWidth + x] = 1;
    }
  }

  return out;
}

// ------------------------------------------------------------------- tracing

/**
 * Marching squares over the ink mask. Every boundary between ink and paper
 * becomes a segment; segments are linked into closed loops. Fill-rule evenodd
 * then renders loops inside letters as holes, whatever their winding.
 */
function traceContours(mask, width, height) {
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : mask[y * width + x]);

  // Edge midpoints in doubled pixel coordinates, so every point is an integer.
  const edges = {
    top: (x, y) => [2 * x - 1, 2 * y - 2],
    right: (x, y) => [2 * x, 2 * y - 1],
    bottom: (x, y) => [2 * x - 1, 2 * y],
    left: (x, y) => [2 * x - 2, 2 * y - 1],
  };

  const cases = [
    [],
    [['top', 'left']],
    [['top', 'right']],
    [['left', 'right']],
    [['right', 'bottom']],
    [['top', 'left'], ['right', 'bottom']],
    [['top', 'bottom']],
    [['left', 'bottom']],
    [['bottom', 'left']],
    [['top', 'bottom']],
    [['top', 'right'], ['bottom', 'left']],
    [['right', 'bottom']],
    [['left', 'right']],
    [['top', 'right']],
    [['top', 'left']],
    [],
  ];

  const segments = [];

  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      const index =
        at(x - 1, y - 1) | (at(x, y - 1) << 1) | (at(x, y) << 2) | (at(x - 1, y) << 3);
      for (const [from, to] of cases[index]) {
        segments.push([edges[from](x, y), edges[to](x, y)]);
      }
    }
  }

  // Link segments into loops by shared endpoints.
  const key = ([x, y]) => `${x},${y}`;
  const byPoint = new Map();
  segments.forEach((segment, i) => {
    for (const point of segment) {
      const k = key(point);
      if (!byPoint.has(k)) byPoint.set(k, []);
      byPoint.get(k).push(i);
    }
  });

  const used = new Array(segments.length).fill(false);
  const loops = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;

    used[i] = true;
    const loop = [segments[i][0], segments[i][1]];
    let current = i;
    let end = segments[i][1];

    for (;;) {
      const candidates = (byPoint.get(key(end)) || []).filter((j) => !used[j]);
      if (!candidates.length) break;

      const next = candidates[0];
      used[next] = true;
      const [a, b] = segments[next];
      end = key(a) === key(end) ? b : a;
      loop.push(end);
      current = next;
      if (key(end) === key(loop[0])) break;
    }

    if (loop.length > 2) loops.push(loop);
  }

  return loops;
}

function perpendicularDistance(point, start, end) {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const dx = ex - sx;
  const dy = ey - sy;

  if (dx === 0 && dy === 0) return Math.hypot(px - sx, py - sy);

  const t = ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (sx + clamped * dx), py - (sy + clamped * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];

  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

// ------------------------------------------------------------------- output

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/** Minimal 8-bit greyscale PNG writer — used only to show the ink mask. */
function encodeGrayPng(width, height, gray) {
  const stride = width + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    gray.copy(raw, y * stride + 1, y * width, y * width + width);
  }

  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 0);
    return Buffer.concat([head, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);

  return candidates.find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
}

/** Render the trace back to pixels so it can be compared against the source ink. */
function rasterise(svg, file, width, height) {
  const browser = findBrowser();
  if (!browser) return null;

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style></head><body>${svg.replace(
    /<svg/,
    `<svg width="${width}" height="${height}"`
  )}</body></html>`;

  const htmlFile = path.join(WORK, 'raster.html');
  fs.writeFileSync(htmlFile, html);

  spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      `--user-data-dir=${path.join(WORK, 'profile')}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--virtual-time-budget=3000',
      `--screenshot=${file}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] }
  );

  return fs.existsSync(file) ? decodePng(file) : null;
}

// -------------------------------------------------------------------- probes

/** ASCII rendering of a mask, so the isolation can be read at a glance. */
function ascii(mask, width, height, columns = 118) {
  const scale = width / columns;
  const rows = Math.max(1, Math.round((height / scale) * 0.5));
  const lines = [];

  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < columns; c++) {
      const x0 = Math.floor(c * scale);
      const x1 = Math.max(x0 + 1, Math.floor((c + 1) * scale));
      const y0 = Math.floor(r * scale * 2);
      const y1 = Math.max(y0 + 1, Math.floor((r + 1) * scale * 2));
      let on = 0;
      let total = 0;
      for (let y = y0; y < Math.min(y1, height); y++) {
        for (let x = x0; x < Math.min(x1, width); x++) {
          total += 1;
          on += mask[y * width + x];
        }
      }
      const ratio = total ? on / total : 0;
      line += ratio > 0.3 ? '#' : ratio > 0 ? '+' : ' ';
    }
    lines.push(line.replace(/\s+$/, ''));
  }

  return lines.join('\n');
}

function analyze(source) {
  const { width, height, data } = source;
  const total = width * height;
  const blueness = new Int32Array(total);
  const luminance = new Uint8Array(total);

  for (let i = 0; i < total; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    blueness[i] = Math.round(b - (r + g) / 2);
    luminance[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Alpha first: a paste may carry transparency, in which case RGB is unreliable.
  let alphaMin = 255;
  let alphaMax = 0;
  let alphaSum = 0;
  let opaque = 0;
  let transparent = 0;
  for (let i = 0; i < total; i++) {
    const a = data[i * 4 + 3];
    alphaMin = Math.min(alphaMin, a);
    alphaMax = Math.max(alphaMax, a);
    alphaSum += a;
    if (a === 255) opaque += 1;
    if (a < 8) transparent += 1;
  }
  console.log(
    `alpha  min ${alphaMin} max ${alphaMax} mean ${(alphaSum / total).toFixed(1)} opaque ${((opaque / total) * 100).toFixed(1)}% transparent ${((transparent / total) * 100).toFixed(1)}%`
  );

  const samples = [
    [0, 0],
    [Math.floor(width / 2), Math.floor(height / 2)],
    [width - 1, height - 1],
    [Math.floor(width * 0.2), Math.floor(height * 0.5)],
    [Math.floor(width * 0.8), Math.floor(height * 0.3)],
  ];
  console.log('samples (x,y,rgba):');
  for (const [x, y] of samples) {
    const i = (y * width + x) * 4;
    console.log(`  ${x},${y}  ${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`);
  }

  console.log('\nwhole-frame luminance (dark = #):');
  const darkMask = new Uint8Array(total);
  for (let i = 0; i < total; i++) darkMask[i] = luminance[i] <= 140 ? 1 : 0;
  console.log(ascii(darkMask, width, height, 100));

  console.log('\nblueness thresholds');
  for (const t of [0, 5, 10, 15, 20, 25, 30, 40, 50]) {
    const count = blueness.reduce((acc, value) => acc + (value >= t ? 1 : 0), 0);
    console.log(
      `  >= ${String(t).padStart(2)}  ${String(count).padStart(7)} px  ${((count / total) * 100).toFixed(2).padStart(5)}%`
    );
  }

  console.log('\ndark pixels by luminance');
  for (const t of [60, 90, 120, 150, 180, 200]) {
    const count = luminance.reduce((acc, value) => acc + (value <= t ? 1 : 0), 0);
    console.log(
      `  <= ${String(t).padStart(3)}  ${String(count).padStart(7)} px  ${((count / total) * 100).toFixed(2).padStart(5)}%`
    );
  }

  // Anything that differs from the corner colour: shows the shape without a threshold.
  const background = new Uint8Array(total);
  const bg = [data[0], data[1], data[2]];
  for (let i = 0; i < total; i++) {
    const diff =
      Math.abs(data[i * 4] - bg[0]) +
      Math.abs(data[i * 4 + 1] - bg[1]) +
      Math.abs(data[i * 4 + 2] - bg[2]);
    background[i] = diff >= 12 ? 1 : 0;
  }
  const backgroundCount = background.reduce((acc, v) => acc + v, 0);
  console.log(`\n=== not background (corner ${bg.join(',')}) — ${backgroundCount} px ===`);
  console.log(ascii(background, width, height, 118));

  for (const t of [1, 3, 8, 15, 25]) {
    const mask = new Uint8Array(total);
    for (let i = 0; i < total; i++) mask[i] = blueness[i] >= t && luminance[i] <= 215 ? 1 : 0;
    const on = mask.reduce((acc, v) => acc + v, 0);
    console.log(`\n=== blueness >= ${t} and lum <= 215 — ${on} px ===`);
    console.log(ascii(mask, width, height));
  }
}

// ---------------------------------------------------------------------- main

const source = decodePng(SOURCE);

if (FLAGS.includes('--analyze')) {
  analyze(source);
  process.exit(0);
}
const { mask, ink, maxBlueness } = buildMask(source);
const specks = removeSpecks(mask, source.width, source.height);

const bounds = inkBounds(mask, source.width, source.height);
if (bounds.maxX < 0) throw new Error('no ink found — check the colour thresholds');

const padding = 2;
const crop = {
  x: Math.max(0, bounds.minX - padding),
  y: Math.max(0, bounds.minY - padding),
  width: Math.min(source.width, bounds.maxX + padding + 1) - Math.max(0, bounds.minX - padding),
  height: Math.min(source.height, bounds.maxY + padding + 1) - Math.max(0, bounds.minY - padding),
};

// Crop the mask to the ink bounds.
const cropMask = new Uint8Array(crop.width * crop.height);
for (let y = 0; y < crop.height; y++) {
  for (let x = 0; x < crop.width; x++) {
    cropMask[y * crop.width + x] = mask[(y + crop.y) * source.width + (x + crop.x)];
  }
}

/*
 * Two passes before tracing. Growing the ink preserves the pen weight at the
 * sizes the mark is actually used. Tracing a reduced copy then keeps the
 * outline smooth and the path data small — the strokes are ~59× wider than the
 * final render, so the extra detail would only be noise.
 */
const grown = growMask(cropMask, crop.width, crop.height, GROW);
const factor = Math.max(1, Math.round(crop.height / TARGET_HEIGHT));
const tracedWidth = Math.max(1, Math.round(crop.width / factor));
const tracedHeight = Math.max(1, Math.round(crop.height / factor));
const traced = downscale(grown, crop.width, crop.height, factor, tracedWidth, tracedHeight);

const loops = traceContours(traced, tracedWidth, tracedHeight);
const paths = [];
let pointsBefore = 0;
let pointsAfter = 0;
let dropped = 0;

for (const loop of loops) {
  // Doubled coordinates back to pixels; drop the duplicated closing point.
  const points = loop.slice(0, -1).map(([x, y]) => [x / 2, y / 2]);
  if (points.length < 3) {
    dropped += 1;
    continue;
  }

  const simplified = simplify(points, SIMPLIFY_TOLERANCE).slice(0, -1);
  if (simplified.length < 3) {
    dropped += 1;
    continue;
  }

  pointsBefore += points.length;
  pointsAfter += simplified.length;
  paths.push(
    `M${simplified.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`
  );
}

function round(value) {
  return Math.round(value * 10) / 10;
}

const viewBox = `0 0 ${tracedWidth} ${tracedHeight}`;
const pathData = paths.join(' ');

const svgFile = `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">\n  <path d="${pathData}" fill="currentColor" fill-rule="evenodd" />\n</svg>\n`;

const tsFile = `// Generated by scripts/trace-signature.mjs from a photo of the handwritten
// signature — do not edit by hand. Re-run: node scripts/trace-signature.mjs
export const SIGNATURE_VIEWBOX = '${viewBox}';
export const SIGNATURE_WIDTH = ${tracedWidth};
export const SIGNATURE_HEIGHT = ${tracedHeight};
export const SIGNATURE_PATH =
  '${pathData}';
`;

fs.mkdirSync(WORK, { recursive: true });
fs.writeFileSync(OUT_SVG, svgFile);
fs.writeFileSync(OUT_TS, tsFile);

// Compare source ink against a rasterised trace.
let iou = null;
const rendered = rasterise(svgFile, path.join(WORK, 'raster.png'), tracedWidth, tracedHeight);
if (rendered && (rendered.width !== tracedWidth || rendered.height !== tracedHeight)) {
  console.log(
    `\nwarning: rasterised at ${rendered.width}×${rendered.height}, expected ${tracedWidth}×${tracedHeight} — IoU skipped`
  );
}
let renderedInk = null;
if (rendered && rendered.width === tracedWidth && rendered.height === tracedHeight) {
  let intersection = 0;
  let union = 0;
  let painted = 0;
  for (let i = 0; i < traced.length; i++) {
    const a = traced[i] === 1;
    const r = rendered.data[i * 4];
    const g = rendered.data[i * 4 + 1];
    const b = rendered.data[i * 4 + 2];
    const isInk = (r + g + b) / 3 < 140;
    if (isInk) painted += 1;
    if (a && isInk) intersection += 1;
    if (a || isInk) union += 1;
  }
  iou = union ? intersection / union : 0;
  renderedInk = painted / traced.length;
}

// The exact mask that was traced, so the isolation can be judged rather than trusted.
const maskGray = Buffer.alloc(traced.length);
for (let i = 0; i < traced.length; i++) maskGray[i] = traced[i] ? 0 : 255;
const maskFile = path.join(WORK, 'mask.png');
fs.writeFileSync(maskFile, encodeGrayPng(tracedWidth, tracedHeight, maskGray));

// The cropped photo itself, at the same resolution, for a side-by-side.
const cropGray = Buffer.alloc(tracedWidth * tracedHeight);
for (let y = 0; y < tracedHeight; y++) {
  for (let x = 0; x < tracedWidth; x++) {
    let sum = 0;
    let n = 0;
    for (let sy = y * factor; sy < Math.min((y + 1) * factor, crop.height); sy++) {
      for (let sx = x * factor; sx < Math.min((x + 1) * factor, crop.width); sx++) {
        const i = ((sy + crop.y) * source.width + (sx + crop.x)) * 4;
        sum +=
          0.299 * source.data[i] + 0.587 * source.data[i + 1] + 0.114 * source.data[i + 2];
        n += 1;
      }
    }
    cropGray[y * tracedWidth + x] = Math.round(sum / n);
  }
}
const cropFile = path.join(WORK, 'source-crop.png');
fs.writeFileSync(cropFile, encodeGrayPng(tracedWidth, tracedHeight, cropGray));

const inline = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`;

fs.writeFileSync(
  path.join(WORK, 'compare.html'),
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>signature trace</title>
<style>
  body{margin:0;padding:20px;background:#faf9f7;color:#1c1917;font:400 13px/1.5 ui-monospace,Menlo,monospace}
  h2{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#78716c;margin:0 0 8px;font-weight:400}
  img{display:block;width:100%;max-width:100%;height:auto;border:1px solid rgba(28,25,23,.12);border-radius:6px}
  h2{margin:16px 0 8px}
</style></head><body>
<h2>source photo, cropped to ink (${tracedWidth}×${tracedHeight})</h2>
<img src="${inline(cropFile)}" alt="source">
<h2>isolated ink, grown 2px</h2>
<img src="${inline(maskFile)}" alt="mask">
<h2>traced svg rasterised</h2>
<img src="${inline(path.join(WORK, 'raster.png'))}" alt="trace">
<h2>as used — 28px tall, currentColor</h2>
<div style="background:#faf9f7;padding:12px;border:1px solid rgba(28,25,23,.12);border-radius:6px">
  <svg viewBox="${viewBox}" style="height:28px;width:auto;color:#1c1917">${svgFile.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
</div>
<h2>in a dark header</h2>
<div style="background:#121110;padding:12px;border-radius:6px">
  <svg viewBox="${viewBox}" style="height:28px;width:auto;color:#ede8df">${svgFile.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>
</div>
</body></html>`
);

console.log(`source          ${source.width}×${source.height}, max blueness ${Math.round(maxBlueness)}`);
console.log(`ink pixels      ${ink} (${((ink / (source.width * source.height)) * 100).toFixed(1)}% of frame)`);
console.log(`specks removed  ${specks} px`);
console.log(`ink bounds      x ${bounds.minX}–${bounds.maxX}, y ${bounds.minY}–${bounds.maxY}`);
console.log(`cropped         ${crop.width}×${crop.height} (ratio ${(crop.width / crop.height).toFixed(2)})`);
console.log(`traced at       ${tracedWidth}×${tracedHeight} (1/${factor})`);
console.log(`stroke weight   grown by ${GROW}px before tracing`);
console.log(`loops           ${paths.length} kept, ${dropped} dropped`);
console.log(`points          ${pointsBefore} → ${pointsAfter} after simplify`);
console.log(`svg             ${(svgFile.length / 1024).toFixed(1)} KB`);
console.log(`mask coverage   ${((traced.reduce((acc, v) => acc + v, 0) / traced.length) * 100).toFixed(1)}%`);
console.log(
  `render coverage ${renderedInk === null ? 'n/a' : (renderedInk * 100).toFixed(1) + '%'}`
);
console.log(`iou vs source   ${iou === null ? 'not measured (no browser)' : iou.toFixed(3)}`);
