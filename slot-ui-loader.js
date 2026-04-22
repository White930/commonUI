/**
 * slot-ui-loader.js
 * 自動抓取並注入 slot-control.html，不依賴框架或場景節點。
 * 在 index.ejs 中以 <script src="slot-ui/loader.js"></script> 載入。
 */
(function () {
  'use strict';

  // 計算 loader.js 所在目錄（例如 "slot-ui/"）
  var BASE_PATH = (function () {
    var scripts = document.querySelectorAll('script[src]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      if (src.indexOf('loader.js') !== -1) {
        // 取出目錄部分，例如 "slot-ui/loader.js" → "slot-ui/"
        return src.replace('loader.js', '');
      }
    }
    return 'slot-ui/';
  })();

  var UI_URL = BASE_PATH + 'slot-control.html';

  function injectUI() {
    fetch(UI_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        // ── 修正圖片路徑：HTML src 屬性 + JS 字串字面值 ─────────────────────
        html = html.replace(/src="images\//g,  'src="'  + BASE_PATH + 'images/');
        html = html.replace(/'images\//g,       "'"      + BASE_PATH + 'images/');

        var parser = new DOMParser();
        var doc    = parser.parseFromString(html, 'text/html');

        // ── inject <style> ───────────────────────────────────────────────────
        doc.head.querySelectorAll('style').forEach(function (s) {
          if (document.querySelector('style[data-from="slot-control"]')) return;
          var el = document.createElement('style');
          el.setAttribute('data-from', 'slot-control');
          el.textContent = s.textContent;
          document.head.appendChild(el);
        });

        // ── inject container ─────────────────────────────────────────────────
        var container = document.createElement('div');
        container.id  = 'slot-ctrl-root';
        container.style.cssText = [
          'position:fixed', 'bottom:0', 'left:0',
          'width:100%', 'z-index:9999', 'pointer-events:none',
        ].join(';');

        Array.from(doc.body.childNodes).forEach(function (node) {
          if (node.nodeName !== 'SCRIPT') {
            container.appendChild(document.importNode(node, true));
          }
        });
        document.body.appendChild(container);

        // pointer-events: auto for interactive layers
        ['portrait', 'landscape', 'settings-overlay', 'hs-overlay', 'auto-overlay'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.style.pointerEvents = 'auto';
        });

        // ── execute <script> ─────────────────────────────────────────────────
        doc.body.querySelectorAll('script').forEach(function (s) {
          var el = document.createElement('script');
          el.textContent = s.textContent;
          document.body.appendChild(el);
        });

        // ── overlay z-index fix ──────────────────────────────────────────────
        var fix = document.createElement('style');
        fix.textContent = '#settings-overlay,#hs-overlay,#auto-overlay{z-index:100000!important;}';
        document.head.appendChild(fix);

        console.log('[SlotUI] 注入完成，BASE_PATH=' + BASE_PATH);
      })
      .catch(function (e) {
        console.error('[SlotUI] 載入失敗：', e);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectUI);
  } else {
    injectUI();
  }
})();
