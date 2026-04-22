  /* ── Auto Play panel ── */
  var autoState = {
    speed:        'normal',
    bet:          0,
    betIdx:       0,
    spins:        10,
    untilFeature: false,
  };
  var SPIN_OPTIONS = [5, 10, 20, 50, 100, 200, 500];
  var autoSpinRunning = false;

  function openAutoPanel() {
    autoState.bet    = state.totalBet;
    autoState.betIdx = 0;
    autoState.speed  = SPEED_LABELS[state.speedMode] || 'normal';
    renderAutoPanel();
    document.getElementById('auto-overlay').classList.add('open');
  }
  function closeAutoPanel() {
    document.getElementById('auto-overlay').classList.remove('open');
  }

  function renderAutoPanel() {
    document.getElementById('ap-bet-val').textContent  = fmt(autoState.bet);
    document.getElementById('ap-spin-val').textContent =
      autoState.spins >= 999 ? '∞' : String(autoState.spins);
    var toggle = document.getElementById('ap-feature-toggle');
    if (autoState.untilFeature) toggle.classList.add('on');
    else toggle.classList.remove('on');
    document.querySelectorAll('#auto-panel .ap-speed-zone').forEach(function(btn) {
      if (btn.dataset.spd === autoState.speed) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function initAutoPanel() {
    document.getElementById('ap-close').addEventListener('click', closeAutoPanel);
    document.getElementById('auto-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeAutoPanel();
    });

    document.querySelectorAll('.ap-speed-zone').forEach(function(btn) {
      btn.addEventListener('click', function() {
        autoState.speed = this.dataset.spd;
        renderAutoPanel();
      });
    });

    document.getElementById('ap-bet-minus').addEventListener('click', function() {
      var next = Math.max(state.minBet, +(autoState.bet - state.betStep).toFixed(2));
      if (next !== autoState.bet) { autoState.bet = next; renderAutoPanel(); }
    });
    document.getElementById('ap-bet-plus').addEventListener('click', function() {
      var next = Math.min(state.maxBet, +(autoState.bet + state.betStep).toFixed(2));
      if (next !== autoState.bet) { autoState.bet = next; renderAutoPanel(); }
    });

    document.getElementById('ap-spin-minus').addEventListener('click', function() {
      var idx = SPIN_OPTIONS.indexOf(autoState.spins);
      if (idx > 0) { autoState.spins = SPIN_OPTIONS[idx - 1]; renderAutoPanel(); }
      else if (idx === 0) { autoState.spins = 999; renderAutoPanel(); }
    });
    document.getElementById('ap-spin-plus').addEventListener('click', function() {
      var idx = SPIN_OPTIONS.indexOf(autoState.spins);
      if (idx < SPIN_OPTIONS.length - 1) { autoState.spins = SPIN_OPTIONS[idx + 1]; renderAutoPanel(); }
      else { autoState.spins = 999; renderAutoPanel(); }
    });

    document.getElementById('ap-feature-toggle').addEventListener('click', function() {
      autoState.untilFeature = !autoState.untilFeature;
      renderAutoPanel();
    });

    document.getElementById('ap-start').addEventListener('click', function() {
      closeAutoPanel();
      var speedIdx = SPEED_LABELS.indexOf(autoState.speed);
      if (speedIdx < 0) speedIdx = 0;
      if (speedIdx !== state.speedMode) {
        state.speedMode = speedIdx;
        renderSpeed();
      }
      dispatch('autoSpinStart', {
        bet:          autoState.bet,
        spins:        autoState.spins >= 999 ? -1 : autoState.spins,
        speed:        autoState.speed,
        speedIndex:   speedIdx,
        untilFeature: autoState.untilFeature,
      });
    });
  }

  function setAutoSpinning(running, remaining) {
    autoSpinRunning = running;
    var countText = running ? (remaining > 0 ? String(remaining) : '∞') : '∞';
    ['p-spin-auto-count', 'l-spin-auto-count'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = countText;
    });
    ['p-spin', 'l-spin'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (running) el.classList.add('auto-locked');
      else         el.classList.remove('auto-locked');
    });
  }

  function onAuto() {
    if (autoSpinRunning) {
      dispatch('autoSpinStop', {});
    } else {
      openAutoPanel();
    }
  }
