/**
 * SlotUIConnector.js
 * 橋接 slot-control.html（iframe）與遊戲引擎。
 *
 * 使用方式：
 *   const connector = new SlotUIConnector(iframe.contentWindow, handler);
 *
 * handler 需實作 ISlotControlHandler 的所有方法。
 * Connector 本身不含任何遊戲邏輯。
 */

/**
 * @interface ISlotControlHandler
 *
 * onSpin              ({ bet, speed })
 * onSpinStop          ({ bet })
 * onBetChange         ({ totalBet, direction })
 * onSpeedChange       ({ mode, modeIndex })
 * onAutoSpinStart     ({ bet, spins, speed, speedIndex, untilFeature })
 * onAutoSpinStop      ({})
 * onHyperSpinStart    ({ bet, spins, superBet, stopAtScatter })
 * onHyperSpinScatterInfo ({})
 * onMenuHistory       ({})
 * onMenuFullscreen    ({})
 * onMenuHowToPlay     ({})
 * onSettingsSpeedChange ({ speed })
 * onSettingsSfxChange   ({ on })
 * onSettingsMusicChange ({ on })
 * onSettingsFavoriteChange ({ on })
 * onLayoutChange      ({ layout, width, height })
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.SlotUIConnector = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  var UI_EVENTS = [
    'spin', 'spinStop', 'betChange', 'speedChange',
    'autoSpinStart', 'autoSpinStop',
    'hyperSpinStart', 'hyperSpinScatterInfo',
    'menuHistory', 'menuFullscreen', 'menuHowToPlay',
    'settingsSpeedChange', 'settingsSfxChange',
    'settingsMusicChange', 'settingsFavoriteChange',
    'layoutChange',
  ];

  function SlotUIConnector(uiWindow, handler) {
    this._win     = uiWindow;
    this._handler = handler;
    this._bindUIEvents();
  }

  /* ── Game → UI ──────────────────────────────── */
  SlotUIConnector.prototype.setBalance   = function (v)        { this._send('setBalance',    { balance: v }); };
  SlotUIConnector.prototype.setTotalBet  = function (v)        { this._send('setTotalBet',   { totalBet: v }); };
  SlotUIConnector.prototype.setTotalWin  = function (v)        { this._send('setTotalWin',   { totalWin: v }); };
  SlotUIConnector.prototype.setBetStep   = function (v)        { this._send('setBetStep',    { betStep: v }); };
  SlotUIConnector.prototype.setBetRange  = function (min, max) { this._send('setBetRange',   { minBet: min, maxBet: max }); };
  SlotUIConnector.prototype.setSpinning  = function (on)       { this._send('setSpinning',   { spinning: on }); };
  SlotUIConnector.prototype.setSpeedMode = function (idx)      { this._send('setSpeedMode',  { modeIndex: idx }); };
  SlotUIConnector.prototype.setAutoSpinning = function (running, remaining) {
    this._send('setAutoSpinning', { running: running, remaining: remaining });
  };

  /* ── UI → Game (純轉發，無邏輯) ─────────────── */
  SlotUIConnector.prototype._bindUIEvents = function () {
    var self = this;
    UI_EVENTS.forEach(function (name) {
      var method = 'on' + name.charAt(0).toUpperCase() + name.slice(1);
      self._win.addEventListener('slotControl:' + name, function (e) {
        if (typeof self._handler[method] === 'function') {
          self._handler[method](e.detail);
        }
      });
    });
  };

  SlotUIConnector.prototype._send = function (type, detail) {
    this._win.dispatchEvent(
      new CustomEvent('slotControl:' + type, { detail: detail })
    );
  };

  return SlotUIConnector;
}));
