#!/usr/bin/env node
/**
 * deploy-cocos.js — Build + deploy slot-ui to a Cocos Creator 3.x project.
 *
 * Usage:
 *   node deploy-cocos.js <client>
 *   node deploy-cocos.js client-55
 *   node deploy-cocos.js client-59
 *
 * Deploys to:
 *   1. <client>/preview-template/slot-ui/           (Cocos 預覽模板)
 *   2. <client>/build-templates/web-mobile/slot-ui/ (Cocos build 模板)
 *   3. <client>/build/web-mobile/slot-ui/           (現有 build 輸出，若目錄存在)
 *
 * 同時自動在兩個 index.ejs 的 </body> 前注入 loader script tag（冪等，已存在則略過）。
 */

const os   = require('os');
const fs   = require('fs');
const path = require('path');

/* ── 路徑（跨平台）── */
const DOCS = path.join(os.homedir(), 'Documents');
const SRC  = __dirname;

/* ── 參數 ── */
const clientArg = process.argv[2];

if (!clientArg) {
  console.error('✘ 使用方式：node deploy-cocos.js <client>');
  console.error('   範例：node deploy-cocos.js client-55');
  process.exit(1);
}

const PROJECT = path.join(DOCS, clientArg);

if (!fs.existsSync(PROJECT)) {
  console.error('✘ 專案目錄不存在：', PROJECT);
  process.exit(1);
}
console.log('→ 部署目標：' + clientArg);

/* ── Cocos 標準目錄 ── */
const TEMPLATE_DIRS = [
  path.join(PROJECT, 'preview-template'),
  path.join(PROJECT, 'build-templates', 'web-mobile'),
];
const BUILD_OUT = path.join(PROJECT, 'build', 'web-mobile');

/* ── helpers ── */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(function (file) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  });
}

/** index.ejs 注入 loader script tag（冪等） */
function injectLoaderTag(ejsPath) {
  if (!fs.existsSync(ejsPath)) return;
  let content = fs.readFileSync(ejsPath, 'utf8');
  if (content.includes('slot-ui/loader.js')) {
    console.log('  (loader tag 已存在，略過) ' + path.relative(DOCS, ejsPath));
    return;
  }
  // 在 </body> 前插入
  content = content.replace(/(\s*<\/body>)/, '\n    <script src="slot-ui/loader.js"></script>$1');
  fs.writeFileSync(ejsPath, content);
  console.log('✓ 注入 loader tag → ' + path.relative(DOCS, ejsPath));
}

/* ── 1. Build ── */
require('./build.js');

const htmlSrc   = path.join(SRC, 'dist', 'slot-control.html');
const imgSrc    = path.join(SRC, 'images');
const loaderSrc = path.join(SRC, 'slot-ui-loader.js');

/* ── 2. 複製到 Cocos template 目錄 + 注入 index.ejs ── */
TEMPLATE_DIRS.forEach(function (tplDir) {
  if (!fs.existsSync(tplDir)) {
    console.log('⚠ 找不到 template 目錄，跳過：' + path.relative(DOCS, tplDir));
    return;
  }
  const slotUiDir = path.join(tplDir, 'slot-ui');
  if (!fs.existsSync(slotUiDir)) fs.mkdirSync(slotUiDir, { recursive: true });

  fs.copyFileSync(htmlSrc,   path.join(slotUiDir, 'slot-control.html'));
  fs.copyFileSync(loaderSrc, path.join(slotUiDir, 'loader.js'));
  copyDir(imgSrc, path.join(slotUiDir, 'images'));

  // 若 template 本身有 connector.js，保留（不覆蓋）；否則不做任何事
  const existingConnector = path.join(tplDir, 'slot-ui', 'connector.js');
  if (fs.existsSync(existingConnector)) {
    console.log('  (connector.js 已存在，保留) ' + path.relative(DOCS, existingConnector));
  }

  console.log('✓ ' + path.relative(DOCS, tplDir) + '/slot-ui/ 已更新');
  injectLoaderTag(path.join(tplDir, 'index.ejs'));
});

/* ── 3. 更新現有 build 輸出（若存在）── */
if (fs.existsSync(BUILD_OUT)) {
  const slotUiOut = path.join(BUILD_OUT, 'slot-ui');
  if (!fs.existsSync(slotUiOut)) fs.mkdirSync(slotUiOut, { recursive: true });
  fs.copyFileSync(htmlSrc,   path.join(slotUiOut, 'slot-control.html'));
  fs.copyFileSync(loaderSrc, path.join(slotUiOut, 'loader.js'));
  copyDir(imgSrc, path.join(slotUiOut, 'images'));
  console.log('✓ ' + path.relative(DOCS, BUILD_OUT) + '/slot-ui/ 已更新');
} else {
  console.log('⚠ build/web-mobile/ 不存在，跳過（Cocos 尚未 build）');
}
