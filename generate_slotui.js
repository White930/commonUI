/**
 * 產生內嵌版 SlotUI.ts（圖片 base64 + CSS/HTML/JS 全部內嵌）
 * node generate_slotui.js
 */
const fs   = require('fs');
const path = require('path');

// ── 1. 讀取圖片並轉 base64 ────────────────────────────────────────────────────
const imgDir = path.join(__dirname, 'images');
function b64(name) {
  const f = path.join(imgDir, name);
  if (!fs.existsSync(f)) { console.warn('⚠ 圖片不存在，跳過：', name); return null; }
  return 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
}
const _imgs = [
  'UI_BUTTON_AUTOPLAY_IDLE.png',
  'UI_BUTTON_HYPERSPIN.png',
  'UI_BUTTON_MINUS.png',
  'UI_BUTTON_PLUS.png',
  'UI_BUTTON_SETTING.png',
  'UI_BUTTON_SPEED_FAST.png',
  'UI_BUTTON_SPEED_NORMAL.png',
  'UI_BUTTON_SPEED_TURBO.png',
  'UI_BUTTON_SPIN.png',
  'UI_SPEED_SELECTOR.png',
  'UI_SPEED_SELECTOR_NORMAL.png',
  'UI_SPEED_SELECTOR_FAST.png',
  'UI_SPEED_SELECTOR_TURBO.png',
  'SETTINGS_ACTION_HISTORY_ICON.png',
  'SETTINGS_ACTION_FULLSCREEN_ICON.png',
  'SETTINGS_ACTION_HOWTOPLAY_ICON.png',
  'SETTINGS_ACTION_FAVORITE_ICON_ACTIVE.png',
  'FAVORITE.png',
];
const imgMap = {};
_imgs.forEach(function(name) {
  const data = b64(name);
  if (data) imgMap['images/' + name] = data;
});

// ── 2. 讀取 slot-control.html 並替換圖片 ────────────────────────────────────
let html = fs.readFileSync(path.join(__dirname, 'dist', 'slot-control.html'), 'utf8');
for (const [src, data] of Object.entries(imgMap)) {
  // 替換 HTML src 屬性：src="images/..."
  html = html.split('src="' + src + '"').join('src="' + data + '"');
  // 替換 JS 字串字面值：'images/...' （用於動態 img.src 賦值）
  html = html.split("'" + src + "'").join("'" + data + "'");
}

// ── 3. 拆解 CSS / Body HTML / JS ─────────────────────────────────────────────
const cssMatch  = html.match(/<style>([\s\S]*?)<\/style>/);
const css       = (cssMatch ? cssMatch[1] : '').replace(/\bbody\s*\{[^}]*\}/g, '');
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
const bodyHtml  = bodyMatch ? bodyMatch[1].trim() : '';
const jsBlocks  = [];
const scriptRe  = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = scriptRe.exec(html)) !== null) jsBlocks.push(m[1]);
const js = jsBlocks.join('\n');

// ── 4. Escape for TypeScript template literals ────────────────────────────────
function escTpl(s) {
  return s
    .replace(/\\/g,   '\\\\')
    .replace(/`/g,    '\\`')
    .replace(/\$\{/g, '\\${');
}

const cssEsc  = escTpl(css);
const htmlEsc = escTpl(bodyHtml);
const jsEsc   = escTpl(js);

// ── 5. 讀取現有 SlotUI.ts 的頭部（constants + types + class header） ──────────
const existingTs = fs.readFileSync(path.join(__dirname, 'SlotUI.ts'), 'utf8');

// 取出 _injectUI 方法之前的所有內容
const injectStart = existingTs.indexOf('  private _injectUI(): void {');
const beforeInject = existingTs.slice(0, injectStart);

// 取出 _injectUI 之後的所有內容（事件訂閱 + API 方法）
// 找到 _injectUI 結束的位置
let depth = 0, injectEnd = injectStart;
for (let i = injectStart; i < existingTs.length; i++) {
  if (existingTs[i] === '{') depth++;
  if (existingTs[i] === '}') {
    depth--;
    if (depth === 0) { injectEnd = i + 1; break; }
  }
}
const afterInject = existingTs.slice(injectEnd);

// ── 6. 組合新的 _injectUI ─────────────────────────────────────────────────────
const newInjectUI = `  private _injectUI(): void {
    // ── CSS ──────────────────────────────────────────────────────────────────
    if (!document.querySelector('style[data-from="slot-control"]')) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-from', 'slot-control');
      styleEl.textContent = \`${cssEsc}\`;
      document.head.appendChild(styleEl);
    }

    // ── HTML（圖片已內嵌為 base64，無需外部檔案）────────────────────────────
    this._container = document.createElement('div');
    this._container.id = 'slot-ctrl-root';
    Object.assign(this._container.style, {
      position: 'fixed', left: '0', bottom: '0',
      width: '100%', zIndex: '9999', pointerEvents: 'auto',
    });
    this._container.innerHTML = \`${htmlEsc}\`;
    document.body.appendChild(this._container);

    // ── JS ───────────────────────────────────────────────────────────────────
    const scriptEl = document.createElement('script');
    scriptEl.textContent = \`${jsEsc}\`;
    document.body.appendChild(scriptEl);

    this._applyOrientation();
    console.log('[SlotUI] UI 注入完成（內嵌模式）');
  }`;

// ── 7. 寫出 SlotUI.ts ────────────────────────────────────────────────────────
const output = beforeInject + newInjectUI + afterInject;
fs.writeFileSync(path.join(__dirname, 'SlotUI.ts'), output);
console.log('SlotUI.ts 產生完成，大小：', Math.round(output.length / 1024), 'KB');
