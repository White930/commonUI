/**
 * 產生內嵌版 SlotUI.ts（圖片 base64 + CSS/HTML/JS 全部內嵌）
 * node generate_slotui.js
 */
const fs   = require('fs');
const path = require('path');

// ── 1. 讀取圖片並轉 base64 ────────────────────────────────────────────────────
const imgDir = path.join(__dirname, 'images');
const imgMap = {
  'images/UI_BUTTON_AUTOPLAY_IDLE.png': 'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_AUTOPLAY_IDLE.png')).toString('base64'),
  'images/UI_BUTTON_HYPERSPIN.png':     'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_HYPERSPIN.png')).toString('base64'),
  'images/UI_BUTTON_MINUS.png':         'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_MINUS.png')).toString('base64'),
  'images/UI_BUTTON_PLUS.png':          'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_PLUS.png')).toString('base64'),
  'images/UI_BUTTON_SETTING.png':       'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_SETTING.png')).toString('base64'),
  'images/UI_BUTTON_SPEED_FAST.png':    'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_SPEED_FAST.png')).toString('base64'),
  'images/UI_BUTTON_SPIN.png':          'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, 'UI_BUTTON_SPIN.png')).toString('base64'),
};

// ── 2. 讀取 slot-control.html 並替換圖片 ────────────────────────────────────
let html = fs.readFileSync(path.join(__dirname, 'slot-control.html'), 'utf8');
for (const [src, data] of Object.entries(imgMap)) {
  html = html.split('src="' + src + '"').join('src="' + data + '"');
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
