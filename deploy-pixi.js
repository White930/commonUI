#!/usr/bin/env node
/**
 * deploy-pixi.js — Build + deploy slot-ui to a PixiJS / plain-HTML game project.
 *
 * Usage:
 *   node deploy-pixi.js <client> <game> dev   → 部署到開發目錄
 *   node deploy-pixi.js <client> <game> prod  → 部署到 Production/upload/
 *
 * 範例：
 *   node deploy-pixi.js client-21 21fruit dev
 *   node deploy-pixi.js client-21 21fruit prod
 */

const os   = require('os');
const fs   = require('fs');
const path = require('path');

/* ── 路徑（跨平台）── */
const DOCS   = path.join(os.homedir(), 'Documents');
const SRC    = __dirname;
const UPLOAD = path.join(DOCS, 'Production', 'upload');

/* ── 參數 ── */
const clientArg = process.argv[2];
const gameArg   = process.argv[3];
const targetArg = process.argv[4];

if (!clientArg || !gameArg || !targetArg) {
  console.error('✘ 使用方式：node deploy-pixi.js <client> <game> <dev|prod>');
  console.error('   dev  → 部署到開發目錄');
  console.error('   prod → 部署到 Production/upload/');
  console.error('   範例：node deploy-pixi.js client-21 21fruit dev');
  process.exit(1);
}

if (targetArg !== 'dev' && targetArg !== 'prod') {
  console.error('✘ 第三個參數必須是 dev 或 prod，got：' + targetArg);
  process.exit(1);
}

/* ── helpers ── */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(function (file) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  });
}

function deploySlotUI(dest, destLabel) {
  fs.writeFileSync(path.join(dest, 'slot-control.html'), html);
  console.log('✓ slot-control.html → ' + destLabel + '/');
  copyDir(path.join(SRC, 'images'), path.join(dest, 'slot-ui'));
  console.log('✓ images/*          → ' + destLabel + '/slot-ui/');
}

/* ── 1. Build ── */
require('./build.js');

/* ── 2. Rewrite image paths（src="images/ → src="slot-ui/）── */
let html = fs.readFileSync(path.join(SRC, 'dist', 'slot-control.html'), 'utf8');
html = html.replace(/images\//g, 'slot-ui/');

/* ── 3. 依目標部署 ── */
if (targetArg === 'dev') {
  const DEV_DEST = path.join(DOCS, clientArg, gameArg);
  const label    = clientArg + '/' + gameArg;

  if (!fs.existsSync(DEV_DEST)) {
    console.error('✘ 開發目錄不存在：', DEV_DEST);
    process.exit(1);
  }
  console.log('→ 部署目標（開發）：' + label);

  deploySlotUI(DEV_DEST, label);

  // SlotUIConnector.js → js/（給 pack2.sh 編譯）
  const jsDest = path.join(DEV_DEST, 'js');
  if (fs.existsSync(jsDest)) {
    fs.copyFileSync(path.join(SRC, 'SlotUIConnector.js'), path.join(jsDest, 'SlotUIConnector.js'));
    console.log('✓ SlotUIConnector.js → ' + label + '/js/');
  } else {
    console.log('⚠ js/ 資料夾不存在，跳過 SlotUIConnector.js');
  }

} else {
  const prodDest = path.join(UPLOAD, gameArg);

  if (!fs.existsSync(prodDest)) {
    console.error('✘ Production 目錄不存在：', prodDest);
    console.error('   請先執行 ./p.sh ' + gameArg.replace(/[^0-9]/g, '') + ' 產生輸出');
    process.exit(1);
  }
  console.log('→ 部署目標（Production）：Production/upload/' + gameArg);

  deploySlotUI(prodDest, 'Production/upload/' + gameArg);
}
