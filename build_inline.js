const fs = require('fs');
const path = require('path');

const imgDir = 'C:/Users/white.li/Documents/commonUI/images';
const files = {
  AUTOPLAY:  'UI_BUTTON_AUTOPLAY_IDLE.png',
  HYPERSPIN: 'UI_BUTTON_HYPERSPIN.png',
  MINUS:     'UI_BUTTON_MINUS.png',
  PLUS:      'UI_BUTTON_PLUS.png',
  SETTING:   'UI_BUTTON_SETTING.png',
  SPEED:     'UI_BUTTON_SPEED_FAST.png',
  SPIN:      'UI_BUTTON_SPIN.png',
};

const b64 = {};
for (const [k, f] of Object.entries(files)) {
  b64[k] = 'data:image/png;base64,' + fs.readFileSync(path.join(imgDir, f)).toString('base64');
}

let html = fs.readFileSync('C:/Users/white.li/Documents/commonUI/slot-control.html', 'utf8');

// Replace image srcs with base64
html = html
  .replace(/src="images\/UI_BUTTON_AUTOPLAY_IDLE\.png"/g,  'src="' + b64.AUTOPLAY  + '"')
  .replace(/src="images\/UI_BUTTON_HYPERSPIN\.png"/g,       'src="' + b64.HYPERSPIN + '"')
  .replace(/src="images\/UI_BUTTON_MINUS\.png"/g,           'src="' + b64.MINUS     + '"')
  .replace(/src="images\/UI_BUTTON_PLUS\.png"/g,            'src="' + b64.PLUS      + '"')
  .replace(/src="images\/UI_BUTTON_SETTING\.png"/g,         'src="' + b64.SETTING   + '"')
  .replace(/src="images\/UI_BUTTON_SPEED_FAST\.png"/g,      'src="' + b64.SPEED     + '"')
  .replace(/src="images\/UI_BUTTON_SPIN\.png"/g,            'src="' + b64.SPIN      + '"');

// Extract parts
const cssMatch  = html.match(/<style>([\s\S]*?)<\/style>/);
const css       = cssMatch ? cssMatch[1].replace(/\bbody\s*\{[^}]*\}/g, '') : '';
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
const bodyHtml  = bodyMatch ? bodyMatch[1].trim() : '';

const jsBlocks = [];
const scriptRe = /<script>([\s\S]*?)<\/script>/g;
let m;
while ((m = scriptRe.exec(html)) !== null) jsBlocks.push(m[1]);
const js = jsBlocks.join('\n');

// Escape for TypeScript template literal
function escTpl(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

fs.writeFileSync('/tmp/slot_css.txt',  escTpl(css));
fs.writeFileSync('/tmp/slot_html.txt', escTpl(bodyHtml));
fs.writeFileSync('/tmp/slot_js.txt',   escTpl(js));

console.log('css:', css.length, 'html:', bodyHtml.length, 'js:', js.length);
