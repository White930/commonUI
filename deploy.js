#!/usr/bin/env node
/**
 * deploy.js — Build + deploy to client-21.
 *
 * Usage:  node deploy.js
 *
 * Steps:
 *   1. Run build (inline CSS+JS into slot-control.html)
 *   2. Rewrite image paths: src="images/ → src="slot-ui/
 *   3. Copy slot-control.html  → ../client-21/21fruit/slot-control.html
 *   4. Copy images/*           → ../client-21/21fruit/slot-ui/
 *   5. Copy SlotUIConnector.js → ../client-21/21fruit/SlotUIConnector.js
 */
const fs   = require('fs');
const path = require('path');

const SRC  = __dirname;
const DEST = path.join(SRC, '..', 'client-21', '21fruit');

/* ── 1. Build ── */
require('./build.js');

/* ── 2. Rewrite image paths ── */
const htmlPath = path.join(SRC, 'slot-control.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/images\//g, 'slot-ui/');

/* ── 3. Write slot-control.html to client-21 ── */
fs.writeFileSync(path.join(DEST, 'slot-control.html'), html);
console.log('✓ slot-control.html → client-21/21fruit/');

/* ── 4. Sync images/ → slot-ui/ ── */
const imgSrc  = path.join(SRC,  'images');
const imgDest = path.join(DEST, 'slot-ui');
if (!fs.existsSync(imgDest)) fs.mkdirSync(imgDest, { recursive: true });
fs.readdirSync(imgSrc).forEach(function (file) {
  fs.copyFileSync(path.join(imgSrc, file), path.join(imgDest, file));
});
console.log('✓ images/* → client-21/21fruit/slot-ui/');

/* ── 5. Copy SlotUIConnector.js ── */
fs.copyFileSync(
  path.join(SRC,  'SlotUIConnector.js'),
  path.join(DEST, 'SlotUIConnector.js')
);
console.log('✓ SlotUIConnector.js → client-21/21fruit/');
