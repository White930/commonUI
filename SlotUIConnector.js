/**
 * SlotUIConnector.js  —  client-21 / 21fruit
 * ─────────────────────────────────────────────────────────────────────────────
 * 將 slot-control.html 疊加於 PixiJS 畫布之上，
 * 並把 SlotControl 自訂事件雙向連接到 CGame.js。
 *
 * ── 使用方式 ────────────────────────────────────────────────────────────────
 * 在 index.html 的 </head> 結尾加入：
 *   <script src="js/SlotUIConnector.js"></script>
 *
 * ── 遠端 / CDN 模式（UI 與遊戲完全解耦，無需重新打包即可更新）──────────────
 * 在 SlotUIConnector.js 之前加入設定：
 *
 *   <script>
 *     window.SlotUIConnectorConfig = {
 *       url: 'https://your-cdn.example.com/slot-ui/slot-control.html'
 *       // 未設定時自動使用本機 slot-control.html
 *     };
 *   </script>
 *
 * CDN 伺服器需同時提供：
 *   slot-control.html
 *   images/UI_BUTTON_*.png
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── helpers ────────────────────────────────────────────────────────────────

  /** 向 slot-control 發送更新事件（遊戲 → UI 方向） */
  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent('slotControl:' + name, { detail: detail || {} }));
  }

  // ── 1. 載入並注入 slot-control.html ────────────────────────────────────────

  /** 取得 UI HTML 的來源 URL（支援 CDN 設定） */
  function resolveUIUrl() {
    var cfg = window.SlotUIConnectorConfig;
    return (cfg && cfg.url) ? cfg.url : 'slot-control.html';
  }

  /** 從 URL 取得目錄前綴（用於修正相對圖片路徑） */
  function getBaseDir(url) {
    return url.substring(0, url.lastIndexOf('/') + 1);
  }

  function injectSlotControlHTML() {
    var uiUrl = resolveUIUrl();
    fetch(uiUrl)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        // 把相對路徑圖片修正為絕對路徑（CDN 模式必要）
        var baseDir = getBaseDir(uiUrl);
        if (baseDir) {
          html = html.replace(/src="images\//g, 'src="' + baseDir + 'images/');
        }
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        // (a) 注入 <style> 到 head（修正 body 選擇器，避免污染遊戲布局）
        doc.head.querySelectorAll('style').forEach(function (s) {
          var css = s.textContent;
          // 把 body { display:flex … } 改為掛在 #slot-ctrl-container 上，
          // 同時修正 body.is-portrait / body.is-landscape 選擇器
          css = css
            .replace(/body\.is-portrait(\s)/g,  'body.is-portrait #slot-ctrl-container$1')
            .replace(/body\.is-landscape(\s)/g, 'body.is-landscape #slot-ctrl-container$1')
            .replace(/\bbody\s*\{/g,            '#slot-ctrl-container {')
            .replace(/(^|\})\s*\*\s*\{/g,       '$1:where(#slot-ctrl-container) *{');
          var el = document.createElement('style');
          el.textContent = css;
          document.head.appendChild(el);
        });

        // (b) 建立固定容器（fixed 貼底，z-index 蓋過 canvas）
        var container = document.createElement('div');
        container.id = 'slot-ctrl-container';
        container.style.cssText = [
          'position:fixed',
          'bottom:0',
          'left:0',
          'width:100%',
          'z-index:10000',
          'display:flex',
          'flex-direction:column',
          'align-items:center',
          'pointer-events:none'   // 透明區域不攔截遊戲點擊
        ].join(';');

        // (b-2) 把 body 內容（非 script）注入容器
        Array.from(doc.body.childNodes).forEach(function (node) {
          if (node.nodeName !== 'SCRIPT') {
            container.appendChild(document.importNode(node, true));
          }
        });
        document.body.appendChild(container);

        // (c) 讓互動元素重新接收點擊（pointer-events: auto）
        var interactiveIds = [
          'portrait','landscape',
          'settings-overlay','hs-overlay','auto-overlay'
        ];
        interactiveIds.forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.style.pointerEvents = 'auto';
        });

        // (d) 逐一執行 <script>（讓 window.SlotControl / IIFE 正常初始化）
        doc.body.querySelectorAll('script').forEach(function (s) {
          var el = document.createElement('script');
          el.textContent = s.textContent;
          document.body.appendChild(el);
        });

        // (e) 追加一條覆蓋 style，確保 overlay z-index 絕對高於 canvas
        var overrideStyle = document.createElement('style');
        overrideStyle.textContent = [
          '#settings-overlay, #hs-overlay, #auto-overlay {',
          '  z-index: 100000 !important;',
          '}',
          /* 修正 checkLayout() 仍把 is-portrait/is-landscape 加到 body —
             CSS 選擇器已改成 body.is-portrait #slot-ctrl-container 所以 body 上的 class 仍有效 */
        ].join('\n');
        document.head.appendChild(overrideStyle);

        console.log('[SlotUIConnector] slot-control.html 注入完成');
        waitForGame(onGameReady);
      })
      .catch(function (e) {
        console.error('[SlotUIConnector] 無法載入 slot-control.html：', e);
      });
  }

  // ── 2. 等待 s_oGame 就緒 ───────────────────────────────────────────────────

  function waitForGame(cb, attempt) {
    attempt = attempt || 0;
    if (typeof s_oGame !== 'undefined' && s_oGame !== null) {
      cb();
    } else if (attempt < 60) {
      setTimeout(function () { waitForGame(cb, attempt + 1); }, 500);
    } else {
      console.warn('[SlotUIConnector] s_oGame 未在 30s 內就緒');
    }
  }

  // ── 3. 遊戲就緒後的初始化入口 ──────────────────────────────────────────────

  function onGameReady() {
    console.log('[SlotUIConnector] s_oGame 就緒，開始綁定');
    patchGameMethods();
    patchInterfaceArray();
    bindUIEvents();
    pushInitialValues();
  }

  // ── 4. Monkey-patch CGame 方法 ──────────────────────────────────────────────

  function patchGameMethods() {
    var g = s_oGame;

    // 4-a. 餘額更新（UpdateCoin）
    if (!g.__slotUICPatched_UpdateCoin) {
      var _origUpdateCoin = g.UpdateCoin.bind(g);
      g.UpdateCoin = function () {
        _origUpdateCoin();
        dispatch('setBalance', { balance: Global.Coin });
      };
      g.__slotUICPatched_UpdateCoin = true;
    }

    // 4-b. 投注改變
    ['addTotalBet', 'minusTotalBet', 'refreshInterface'].forEach(function (name) {
      if (typeof g[name] !== 'function' || g['__slotUICPatched_' + name]) return;
      var orig = g[name].bind(g);
      g[name] = function () {
        orig.apply(g, arguments);
        var bet = (typeof g.totalBet === 'function')
          ? g.totalBet()
          : (_iCurBet * _iCoinValue * _iLastLineActive);
        dispatch('setTotalBet', { totalBet: bet });
      };
      g['__slotUICPatched_' + name] = true;
    });

    // 4-c. 轉輪開始（onClientSpin）→ setSpinning(true) + 清 totalWin
    if (!g.__slotUICPatched_onClientSpin && typeof g.onClientSpin === 'function') {
      var _origClientSpin = g.onClientSpin.bind(g);
      g.onClientSpin = function (type) {
        _origClientSpin(type);
        dispatch('setSpinning', { spinning: true });
        dispatch('setTotalWin', { totalWin: 0 });
      };
      g.__slotUICPatched_onClientSpin = true;
    }

    // 4-d. 轉輪結束：onCredit（手動 / 一般路徑）
    if (!g.__slotUICPatched_onCredit && typeof g.onCredit === 'function') {
      var _origOnCredit = g.onCredit.bind(g);
      g.onCredit = function () {
        _origOnCredit.apply(g, arguments);
        dispatch('setSpinning', { spinning: false });
        dispatch('setBalance',  { balance: Global.Coin });
      };
      g.__slotUICPatched_onCredit = true;
    }

    // 4-e. 轉輪結束：onCollectWinState（auto-spin 路徑）
    if (!g.__slotUICPatched_onCollectWinState && typeof g.onCollectWinState === 'function') {
      var _origCollect = g.onCollectWinState.bind(g);
      g.onCollectWinState = function () {
        _origCollect.apply(g, arguments);
        dispatch('setSpinning', { spinning: false });
      };
      g.__slotUICPatched_onCollectWinState = true;
    }

    // 4-f. 停止 auto spin（_onStopAuto）
    if (!g.__slotUICPatched_onStopAuto && typeof g._onStopAuto === 'function') {
      var _origStopAuto = g._onStopAuto.bind(g);
      g._onStopAuto = function () {
        _origStopAuto.apply(g, arguments);
        dispatch('setAutoSpinning', { running: false, remaining: 0 });
      };
      g.__slotUICPatched_onStopAuto = true;
    }
  }

  // ── 5. Patch _oInterface 元素（refreshWinText + refreshAuto）─────────────

  var _ifacePatchTimer = null;

  function patchInterfaceArray() {
    if (typeof _oInterface === 'undefined' || !_oInterface || _oInterface.length === 0) {
      _ifacePatchTimer = setTimeout(patchInterfaceArray, 500);
      return;
    }
    clearTimeout(_ifacePatchTimer);
    for (var i = 0; i < _oInterface.length; i++) {
      patchSingleInterface(_oInterface[i]);
    }
    console.log('[SlotUIConnector] _oInterface 已 patch（共 ' + _oInterface.length + ' 個）');
  }

  function patchSingleInterface(iface) {
    // 攔截 refreshWinText(sc) → 同步 totalWin 到 SlotControl UI
    if (!iface.__slotUICPatched_refreshWinText && typeof iface.refreshWinText === 'function') {
      var origWin = iface.refreshWinText.bind(iface);
      iface.refreshWinText = function (sc) {
        origWin(sc);
        dispatch('setTotalWin', { totalWin: sc });
      };
      iface.__slotUICPatched_refreshWinText = true;
    }

    // 攔截 refreshAuto(count) → 同步 auto spin badge
    if (!iface.__slotUICPatched_refreshAuto && typeof iface.refreshAuto === 'function') {
      var origAuto = iface.refreshAuto.bind(iface);
      iface.refreshAuto = function (count) {
        origAuto(count);
        // count < 0 → 無限大；count == 0 → 停止；count > 0 → 剩餘次數
        var running   = (count !== 0);
        var remaining = (count < 0) ? -1 : count;
        dispatch('setAutoSpinning', { running: running, remaining: remaining });
      };
      iface.__slotUICPatched_refreshAuto = true;
    }

    // 攔截 setBtnSpinVisible(visible) → 同步 spinning 狀態
    // 這是遊戲判斷「可以再按 SPIN」的最可靠信號：
    //   visible=true  → 遊戲重新顯示 SPIN 按鈕 → 解鎖 SlotUI
    //   visible=false → 遊戲隱藏 SPIN 按鈕（轉輪中）→ 鎖定 SlotUI
    if (!iface.__slotUICPatched_setBtnSpinVisible && typeof iface.setBtnSpinVisible === 'function') {
      var origSpinVisible = iface.setBtnSpinVisible.bind(iface);
      iface.setBtnSpinVisible = function (visible) {
        origSpinVisible(visible);
        dispatch('setSpinning', { spinning: !visible });
      };
      iface.__slotUICPatched_setBtnSpinVisible = true;
    }
  }

  // ── 6. UI → 遊戲 事件監聽 ──────────────────────────────────────────────────

  function bindUIEvents() {

    // SPIN 按鈕
    window.addEventListener('slotControl:spin', function () {
      if (typeof s_oGame !== 'undefined' && s_oGame) {
        s_oGame.onSpin('CLICK');
      }
    });

    // SPIN 中再按（停輪）
    window.addEventListener('slotControl:spinStop', function () {
      if (typeof s_oGame !== 'undefined' && s_oGame) {
        s_oGame.onSpin('CLICK');
      }
    });

    // 投注 +/-
    window.addEventListener('slotControl:betChange', function (e) {
      if (typeof s_oGame === 'undefined' || !s_oGame) return;
      if (e.detail.direction === 'up')   s_oGame.addTotalBet();
      if (e.detail.direction === 'down') s_oGame.minusTotalBet();
    });

    // 速度模式切換（0=normal 1=fast 2=turbo）
    window.addEventListener('slotControl:speedChange', function (e) {
      if (typeof s_oGame === 'undefined' || !s_oGame) return;
      var idx = e.detail.modeIndex !== undefined ? e.detail.modeIndex : 0;
      if (typeof oPopSetting !== 'undefined' && oPopSetting) {
        oPopSetting.cbQuickSpin.status = (idx === 1);
        oPopSetting.cbTurboSpin.status = (idx === 2);
      }
      s_oGame.changeSpinMode();
    });

    // Auto Spin 開始
    window.addEventListener('slotControl:autoSpinStart', function (e) {
      if (typeof s_oGame === 'undefined' || !s_oGame) return;
      if (typeof oPopSetting === 'undefined' || !oPopSetting) return;
      var spins = e.detail.spins;
      // 999 為 SlotUI 的無限大代號；<= 0 也視為無限
      var range = (typeof spins === 'number' && spins > 0 && spins < 999)
                    ? spins : -2; // -2 = 遊戲內部「無限大」慣例值
      oPopSetting.cbAutoTimes.status = true;
      oPopSetting.cbAutoTimes.val    = range;
      // 同步速度模式（若有指定）
      if (typeof e.detail.modeIndex === 'number') {
        var idx = e.detail.modeIndex;
        oPopSetting.cbQuickSpin.status = (idx === 1);
        oPopSetting.cbTurboSpin.status = (idx === 2);
        s_oGame.changeSpinMode();
      }
      // 呼叫遊戲內部的 _onAutoSpin（會設定 oAutoStop_AutoTimes 並觸發第一輪 spin）
      if (typeof s_oGame._onAutoSpin === 'function') {
        s_oGame._onAutoSpin();
      }
    });

    // Auto Spin 停止
    window.addEventListener('slotControl:autoSpinStop', function () {
      if (typeof s_oGame !== 'undefined' && s_oGame && typeof s_oGame._onStopAuto === 'function') {
        s_oGame._onStopAuto();
      }
    });

    // Settings → History / How to Play（開啟遊戲規則面板）
    window.addEventListener('slotControl:menuHistory', function () {
      if (typeof s_oGame !== 'undefined' && s_oGame && typeof s_oGame.popUp === 'function') {
        s_oGame.popUp('GAME_RULE');
      }
    });
    window.addEventListener('slotControl:menuHowToPlay', function () {
      if (typeof s_oGame !== 'undefined' && s_oGame && typeof s_oGame.popUp === 'function') {
        s_oGame.popUp('GAME_RULE');
      }
    });

    // Settings → Full Screen
    window.addEventListener('slotControl:menuFullscreen', function () {
      var el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        (el.requestFullscreen || el.webkitRequestFullscreen || function(){}).call(el);
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen || function(){}).call(document);
      }
    });

    // Settings → Favorite（呼叫外部 plugin，若無則忽略）
    window.addEventListener('slotControl:menuFavorite', function () {
      var plugin = window.__GAME_PLUGIN__;
      if (plugin && typeof plugin.dispatch === 'function') {
        plugin.dispatch({ type: 'setting/setGameListDialogShow', payload: true });
      }
    });

    // Settings → Speed 選項（從 Settings 面板改變速度）
    window.addEventListener('slotControl:settingsSpeedChange', function (e) {
      if (typeof s_oGame === 'undefined' || !s_oGame) return;
      var speedStr = e.detail.speed || 'normal';
      var idx = { normal: 0, fast: 1, turbo: 2 }[speedStr] || 0;
      if (typeof oPopSetting !== 'undefined' && oPopSetting) {
        oPopSetting.cbQuickSpin.status = (idx === 1);
        oPopSetting.cbTurboSpin.status = (idx === 2);
      }
      s_oGame.changeSpinMode();
      dispatch('setSpeedMode', { modeIndex: idx });
    });

    // Settings → SFX on/off（21fruit 使用 createjs.Sound.muted 控制全域靜音）
    window.addEventListener('slotControl:settingsSfxChange', function (e) {
      if (typeof createjs !== 'undefined' && createjs.Sound) {
        createjs.Sound.muted = !e.detail.on;
        if (typeof muteAudio !== 'undefined') {
          muteAudio = !e.detail.on; // 同步全域旗標
        }
      }
    });

    // Settings → Music on/off（與 SFX 共用同一 createjs 靜音）
    window.addEventListener('slotControl:settingsMusicChange', function (e) {
      if (typeof createjs !== 'undefined' && createjs.Sound) {
        createjs.Sound.muted = !e.detail.on;
        if (typeof muteAudio !== 'undefined') {
          muteAudio = !e.detail.on;
        }
      }
    });
  }

  // ── 7. 推送初始值 ──────────────────────────────────────────────────────────

  function pushInitialValues() {
    function tryPush(attempt) {
      attempt = attempt || 0;
      var coin = (typeof Global !== 'undefined' && Global) ? Global.Coin : 0;
      var bet  = (s_oGame && typeof s_oGame.totalBet === 'function')
                  ? s_oGame.totalBet()
                  : (_iCurBet * _iCoinValue * _iLastLineActive);

      if (coin > 0 || bet > 0) {
        dispatch('setBalance',  { balance:  coin });
        dispatch('setTotalBet', { totalBet: bet  });
        dispatch('setTotalWin', { totalWin: 0    });
        console.log('[SlotUIConnector] 初始值推送完成 — balance:', coin, 'totalBet:', bet);
      } else if (attempt < 30) {
        setTimeout(function () { tryPush(attempt + 1); }, 400);
      } else {
        // 即使值為 0 也推送（確保 UI 不顯示 NaN）
        dispatch('setBalance',  { balance:  0 });
        dispatch('setTotalBet', { totalBet: 0 });
        dispatch('setTotalWin', { totalWin: 0 });
      }
    }
    tryPush();
  }

  // ── 啟動 ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSlotControlHTML);
  } else {
    injectSlotControlHTML();
  }

})();
