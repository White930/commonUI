/* ═══════════════════════════════════════════════════════════════
   方向切換：width < height → 直式 / width > height → 橫式
═══════════════════════════════════════════════════════════════ */
(function () {
  function setOrientation(portrait) {
    document.body.classList.toggle('is-portrait',  portrait);
    document.body.classList.toggle('is-landscape', !portrait);
  }

  var urlParams  = new URLSearchParams(window.location.search);
  var paramValue = urlParams.get('p');
  if (paramValue !== null) {
    setOrientation(paramValue === '1');
  }

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'slotUI:orientation') {
      setOrientation(!!e.data.portrait);
    }
  });

  if (window.self === window.top) {
    function autoDetect() {
      setOrientation(window.innerWidth < window.innerHeight);
    }
    if (paramValue === null) { autoDetect(); }
    window.addEventListener('resize', autoDetect);
    window.addEventListener('orientationchange', function () {
      setTimeout(autoDetect, 50);
    });
  }
})();

/**
 * SlotControl UI — core state, render, and button actions.
 * Build chain: slot-control.js → panel-auto.js → panel-hyperspin.js
 *              → panel-settings.js → slot-control-init.js
 * The IIFE below is intentionally left open; slot-control-init.js closes it.
 */
(function () {
  'use strict';

  /* ── State ── */
  var state = {
    balance:    0,
    totalBet:   0,
    totalWin:   0,
    betStep:    0,
    minBet:     0,
    maxBet:     0,
    speedMode:  1,          // 0=normal  1=fast  2=turbo
    isSpinning: false,
    layout:     ''
  };

  var SPEED_LABELS      = ['normal', 'fast',    'turbo'  ];
  var SPEED_BADGE_TEXT  = ['1',      '2',       '3'      ];
  var SPEED_BADGE_COLOR = ['#999',   '#f7d12e', '#ff4b4b'];
  var SPEED_IMAGES      = ['images/UI_BUTTON_SPEED_NORMAL.png',
                           'images/UI_BUTTON_SPEED_FAST.png',
                           'images/UI_BUTTON_SPEED_TURBO.png'];

  /* ── Helpers ── */
  function fmt(n) {
    return '$ ' + n.toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent('slotControl:' + name, { detail: detail || {} }));
  }

  /* ── Render ── */
  function renderInfo() {
    document.getElementById('p-balance').textContent = fmt(state.balance);
    document.getElementById('p-bet').textContent     = fmt(state.totalBet);
    document.getElementById('p-win').textContent     = fmt(state.totalWin);
    document.getElementById('l-balance').textContent = fmt(state.balance);
    document.getElementById('l-bet').textContent     = fmt(state.totalBet);
    document.getElementById('l-win').textContent     = fmt(state.totalWin);
  }

  function renderSpeed() {
    var src = SPEED_IMAGES[state.speedMode];
    ['p-speed', 'l-speed'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.style.filter = '';
      var img = el.querySelector('img');
      if (img) img.src = src;
    });
  }

  function setSpinning(on) {
    state.isSpinning = on;
    ['p-spin', 'l-spin'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (on) el.classList.add('spinning');
      else    el.classList.remove('spinning');
    });
  }

  function flashBet() {
    ['p-bet', 'l-bet'].forEach(function (id) {
      var el = document.getElementById(id);
      el.classList.remove('flash');
      void el.offsetWidth;
      el.classList.add('flash');
    });
  }

  /* ── Layout detection ── */
  function checkLayout() {
    var isLand = window.innerWidth > window.innerHeight;
    var next   = isLand ? 'landscape' : 'portrait';
    if (next === state.layout) return;
    state.layout = next;
    var p = document.getElementById('portrait');
    var l = document.getElementById('landscape');
    if (isLand) { p.style.display = 'none'; l.style.display = 'flex'; }
    else        { p.style.display = 'flex'; l.style.display = 'none'; }
    dispatch('layoutChange', { layout: next, width: window.innerWidth, height: window.innerHeight });
  }

  /* ── Button actions ── */
  function onSpin() {
    if (state.isSpinning) {
      setSpinning(false);
      dispatch('spinStop', { bet: state.totalBet });
    } else {
      setSpinning(true);
      dispatch('spin', { bet: state.totalBet, speed: SPEED_LABELS[state.speedMode] });
    }
  }

  function onMinus() {
    dispatch('betChange', { totalBet: state.totalBet, direction: 'down' });
    flashBet();
  }

  function onPlus() {
    dispatch('betChange', { totalBet: state.totalBet, direction: 'up' });
    flashBet();
  }

  function onSpeed() {
    state.speedMode = (state.speedMode + 1) % 3;
    renderSpeed();
    dispatch('speedChange', { mode: SPEED_LABELS[state.speedMode], modeIndex: state.speedMode });
  }

  /* ── Panel code follows (injected by build.js) ── */
