  /* ── Wire buttons ── */
  function bind(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  function init() {
    bind('p-spin',   onSpin);    bind('l-spin',   onSpin);
    bind('p-minus',  onMinus);   bind('l-minus',  onMinus);
    bind('p-plus',   onPlus);    bind('l-plus',   onPlus);
    bind('p-speed',  onSpeed);   bind('l-speed',  onSpeed);
    bind('p-auto',   onAuto);    bind('l-auto',   onAuto);
    bind('p-rocket', onRocket);  bind('l-rocket', onRocket);
    bind('p-menu',   onMenu);    bind('l-menu',   onMenu);

    initAutoPanel();
    initSettings();
    initHyperSpinPanel();
    window.addEventListener('resize', checkLayout);
    checkLayout();
    renderInfo();
    renderSpeed();
  }

  /* ── External API (game engine → UI) ── */
  window.addEventListener('slotControl:setBalance', function (e) {
    state.balance = +e.detail.balance; renderInfo();
  });
  window.addEventListener('slotControl:setTotalWin', function (e) {
    state.totalWin = +e.detail.totalWin; renderInfo();
  });
  window.addEventListener('slotControl:setTotalBet', function (e) {
    state.totalBet = +e.detail.totalBet;
    hsState.bet    = state.totalBet;
    renderInfo(); flashBet();
    if (document.getElementById('hs-overlay').classList.contains('open')) {
      document.getElementById('hs-bet-val').textContent = fmt(state.totalBet);
    }
  });
  window.addEventListener('slotControl:setBetStep', function (e) {
    state.betStep = +e.detail.betStep;
  });
  window.addEventListener('slotControl:setBetRange', function (e) {
    state.minBet = +e.detail.minBet;
    state.maxBet = +e.detail.maxBet;
  });
  window.addEventListener('slotControl:setSpinning', function (e) {
    setSpinning(!!e.detail.spinning);
  });
  window.addEventListener('slotControl:setSpeedMode', function (e) {
    state.speedMode = Math.max(0, Math.min(2, +e.detail.modeIndex));
    renderSpeed();
  });
  window.addEventListener('slotControl:setAutoSpinning', function (e) {
    setAutoSpinning(!!e.detail.running, +e.detail.remaining);
  });

  /* ── Public JS API ── */
  window.SlotControl = {
    getState:    function () { return Object.assign({}, state); },
    setBalance:  function (v) { state.balance  = v; renderInfo(); },
    setTotalWin: function (v) { state.totalWin = v; renderInfo(); },
    setTotalBet: function (v) { state.totalBet = v; renderInfo(); flashBet(); },
    setSpinning: setSpinning,
    formatNum:   fmt
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}()); /* ← closes the main IIFE opened in slot-control.js */
