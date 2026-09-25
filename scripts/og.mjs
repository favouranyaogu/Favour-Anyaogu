#!/usr/bin/env node
/**
 * Renders the social cards into `public/og/*.png`, plus a dark set in
 * `public/og/dark/*.png`.
 *
 *   npm run og                  both themes, every card
 *   npm run og -- home notes    just those cards
 *   npm run og -- --theme=dark  just that theme
 *
 * Why a script and not an `opengraph-image.tsx` route: Next's ImageResponse
 * bundles a Node build of `@vercel/og` that crashes on Windows while loading
 * its own wasm (`fileURLToPath` on a `path.join`ed URL), so the build cannot
 * prerender generated cards on the machine this site is developed on.
 *
 * This renders `tools/og-card.template.html` in headless Chrome instead, at
 * exactly 1200×630, with the real Newsreader / Plus Jakarta Sans / JetBrains
 * Mono faces and the site's own palette. Card copy comes from `data/*.json`,
 * so titles and summaries never drift from the content. Re-run it after
 * changing a note's title or summary — the PNGs are committed.
 *
 * Two signature drawings go into the card's signed corner: the written name
 * (public/signature.svg), with the drawn mark (public/mark.svg) laid beneath
 * it. The mark is the same one the header and the favicon carry; the written
 * name is only ever set large, like here.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = path.join(ROOT, 'tools', 'og-card.template.html');
const WORK_DIR = path.join(ROOT, '.freebuff', 'og');
const OUT_DIR = path.join(ROOT, 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;
const DOMAIN = 'favouranyaogu.vercel.app';

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const social = readJson('data/social.json');
const notes = readJson('data/notes.json');

const CARDS = [
  // Page cards — copy lives in data/social.json, the same file the pages read.
  ...Object.entries(social).map(([id, card]) => ({ id, ...card })),
  // One card per note, carrying that note's own title.
  ...notes.map((note) => ({
    id: `note-${note.slug}`,
    route: `${DOMAIN}/blog/${note.slug}`,
    eyebrow: `Note · ${note.date}`,
    title: note.title,
    description: note.description,
  })),
];

/* `npm run og -- home books` renders just those cards, for tuning the layout
   without re-shooting every PNG. No ids means all of them. */
const THEME_FILTER = (
  process.argv.slice(2).find((arg) => arg.startsWith('--theme=')) || ''
)
  .split('=')[1]
  ?.trim();
const SELECTED = (() => {
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
  if (!only.length) return CARDS;

  const unknown = only.filter((id) => !CARDS.some((card) => card.id === id));
  if (unknown.length) {
    console.error(`Unknown card(s): ${unknown.join(', ')}`);
    console.error(`Known: ${CARDS.map((card) => card.id).join(', ')}`);
    process.exit(1);
  }

  return CARDS.filter((card) => only.includes(card.id));
})();

/* Every card is rendered twice, once per theme the site itself offers. A social
   card is fetched by a crawler that never says which theme it is rendering for,
   so only one set can be the one that ships — see CARD_THEME in lib/social.ts.
   `--theme=dark` renders just that set while tuning. */
const ALL_THEMES = [
  { id: 'light', dir: OUT_DIR },
  { id: 'dark', dir: path.join(OUT_DIR, 'dark') },
];

if (THEME_FILTER && !ALL_THEMES.some((theme) => theme.id === THEME_FILTER)) {
  console.error(`Unknown theme: ${THEME_FILTER} — expected ${ALL_THEMES.map((t) => t.id).join(' or ')}`);
  process.exit(1);
}

const THEMES = THEME_FILTER
  ? ALL_THEMES.filter((theme) => theme.id === THEME_FILTER)
  : ALL_THEMES;

const SIGNATURES = [
  ['__SIGNATURE__', 'public/signature.svg'],
  ['__MARK__', 'public/mark.svg'],
];

const FONT_FILES = [
  ['__FONT_SERIF__', 'assets/fonts/Newsreader-Regular.ttf'],
  ['__FONT_SANS__', 'assets/fonts/PlusJakartaSans-Regular.ttf'],
  ['__FONT_MONO__', 'assets/fonts/JetBrainsMono-Regular.ttf'],
];

const BROWSERS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

function findBrowser() {
  const found = BROWSERS.filter(Boolean).find((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });

  if (!found) {
    console.error(
      'No Chrome or Edge found. Set CHROME_PATH to a Chromium binary and re-run.'
    );
    process.exit(1);
  }

  return found;
}

function dataUrl(file) {
  return `data:font/ttf;base64,${fs.readFileSync(path.join(ROOT, file)).toString('base64')}`;
}

function renderHtml(template, card) {
  let html = template;

  for (const [token, file] of FONT_FILES) {
    html = html.split(token).join(dataUrl(file));
  }

  for (const [token, file] of SIGNATURES) {
    const svg = fs.readFileSync(path.join(ROOT, file), 'utf8');
    /* split/join, not replace: path data is opaque to us, `$` included */
    html = html.split(token).join(svg);
  }

  html = html.replace('__CARD_JSON__', JSON.stringify(card).replace(/</g, '\\u003c'));

  return html;
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  const isPng = buffer.slice(1, 4).toString() === 'PNG';
  return { isPng, width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const browser = findBrowser();
const template = fs.readFileSync(TEMPLATE, 'utf8');

fs.mkdirSync(WORK_DIR, { recursive: true });
for (const theme of THEMES) fs.mkdirSync(theme.dir, { recursive: true });

console.log(
  `Rendering ${SELECTED.length} card(s) × ${THEMES.map((theme) => theme.id).join('+')} with ${path.basename(browser)}\n`
);

let failed = 0;

for (const theme of THEMES)
for (const card of SELECTED) {
  const htmlFile = path.join(WORK_DIR, `${theme.id}-${card.id}.html`);
  const pngFile = path.join(theme.dir, `${card.id}.png`);
  const profile = path.join(WORK_DIR, 'profile');
  const label = `${theme.id}/${card.id}`;

  fs.writeFileSync(htmlFile, renderHtml(template, { ...card, theme: theme.id }));

  const run = spawnSync(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${WIDTH},${HEIGHT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      // Let async work (font decoding, paint) settle before the capture.
      '--virtual-time-budget=4000',
      `--screenshot=${pngFile}`,
      pathToFileURL(htmlFile).href,
    ],
    { stdio: ['ignore', 'ignore', 'ignore'] }
  );

  let check = null;
  try {
    check = pngSize(pngFile);
  } catch {
    /* reported below */
  }

  if (run.error || !check || !check.isPng || check.width !== WIDTH || check.height !== HEIGHT) {
    failed += 1;
    console.error(`✗ ${label}`);
    if (run.error) console.error(`  ${run.error.message}`);
    if (check) console.error(`  unexpected output: ${check.width}×${check.height}`);
    else console.error('  no image written');
    continue;
  }

  const kb = Math.round(fs.statSync(pngFile).size / 1024);
  console.log(`✓ ${label.padEnd(42)} ${check.width}×${check.height}  ${kb} KB`);
}

if (failed) {
  console.error(`\n${failed} card(s) failed.`);
  process.exit(1);
}

console.log(
  `\nWrote ${SELECTED.length * THEMES.length} PNG(s) to public/og` +
    (THEMES.some((theme) => theme.id === 'dark') ? ' (dark set in public/og/dark)' : '')
);
