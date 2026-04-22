#!/usr/bin/env node
/**
 * deploy-59.js — Build + deploy to client-59 (Cocos Creator)
 *
 * Usage:  node deploy-59.js
 *
 * Steps:
 *   1. Build slot-control.html
 *   2. Copy slot-control.html → both template slot-ui/ dirs (keep images/ paths)
 *   3. Copy images/ → both template slot-ui/images/ dirs
 *   4. Run generate_slotui.js → update SlotUI.ts (all images embedded as base64)
 *   5. Copy SlotUI.ts + SlotUIComponent.ts → client-59 assets
 */
const fs   = require('fs');
const path = require('path');

const SRC    = __dirname;
const DEST59 = path.join(SRC, '..', 'client-59');

const TEMPLATE_DIRS = [
  path.join(DEST59, 'preview-template'),
  path.join(DEST59, 'build-templates', 'web-mobile'),
];

const ASSETS_DEST = path.join(DEST59, 'assets', 'sub_module', 'game', 'machine', 'controller_folder');

/* ── helpers ── */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(function(file) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  });
}

/* ── 1. Build ── */
require('./build.js');

/* ── 2 & 3. Copy to both template dirs ── */
const htmlSrc = path.join(SRC, 'slot-control.html');
const imgSrc  = path.join(SRC, 'images');

const loaderSrc = path.join(SRC, 'slot-ui-loader.js');

TEMPLATE_DIRS.forEach(function(tplDir) {
  var slotUiDir  = path.join(tplDir, 'slot-ui');
  var imagesDir  = path.join(slotUiDir, 'images');

  if (!fs.existsSync(slotUiDir)) fs.mkdirSync(slotUiDir, { recursive: true });

  // slot-control.html → slot-ui/ (keep src="images/..." relative paths)
  fs.copyFileSync(htmlSrc, path.join(slotUiDir, 'slot-control.html'));

  // slot-ui-loader.js → slot-ui/loader.js
  fs.copyFileSync(loaderSrc, path.join(slotUiDir, 'loader.js'));

  // images/* → slot-ui/images/
  copyDir(imgSrc, imagesDir);

  console.log('✓ ' + path.relative(path.join(SRC, '..'), tplDir) + '/slot-ui/ 已更新');
});

/* ── 4. Regenerate SlotUI.ts (all images embedded) ── */
require('./generate_slotui.js');

/* ── 5. Copy TypeScript files to client-59 assets ── */
if (!fs.existsSync(ASSETS_DEST)) fs.mkdirSync(ASSETS_DEST, { recursive: true });

['SlotUI.ts', 'SlotUIComponent.ts'].forEach(function(file) {
  const src = path.join(SRC, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(ASSETS_DEST, file));
    console.log('✓ ' + file + ' → client-59/assets/.../controller_folder/');
  } else {
    console.warn('⚠ 找不到', file, '，跳過');
  }
});
