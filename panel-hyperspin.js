  /* ── Hyper Spin panel ── */
  var HS_SPIN_OPTIONS = [5, 10, 20, 30, 50];
  var hsState = {
    bet:           0,
    betIdx:        0,
    spins:         10,
    superBet:      false,
    stopAtScatter: false,
  };

  function openHyperSpinPanel() {
    hsState.bet    = state.totalBet;
    hsState.betIdx = 0;
    renderHyperSpinPanel();
    document.getElementById('hs-overlay').classList.add('open');
  }
  function closeHyperSpinPanel() {
    document.getElementById('hs-overlay').classList.remove('open');
  }
  function renderHyperSpinPanel() {
    document.getElementById('hs-bet-val').textContent   = fmt(hsState.bet);
    document.getElementById('hs-spin-val').textContent  = String(hsState.spins);
    document.getElementById('hs-saldo-val').textContent = fmt(state.balance);
    var sbEl = document.getElementById('hs-superbet-toggle');
    var scEl = document.getElementById('hs-scatter-toggle');
    if (hsState.superBet)      sbEl.classList.add('on'); else sbEl.classList.remove('on');
    if (hsState.stopAtScatter) scEl.classList.add('on'); else scEl.classList.remove('on');
  }
  function initHyperSpinPanel() {
    document.getElementById('hs-close').addEventListener('click', closeHyperSpinPanel);
    document.getElementById('hs-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeHyperSpinPanel();
    });

    document.getElementById('hs-bet-minus').addEventListener('click', function() {
      dispatch('betChange', { totalBet: hsState.bet, direction: 'down' });
    });
    document.getElementById('hs-bet-plus').addEventListener('click', function() {
      dispatch('betChange', { totalBet: hsState.bet, direction: 'up' });
    });

    document.getElementById('hs-spin-minus').addEventListener('click', function() {
      var idx = HS_SPIN_OPTIONS.indexOf(hsState.spins);
      if (idx > 0) { hsState.spins = HS_SPIN_OPTIONS[idx - 1]; renderHyperSpinPanel(); }
    });
    document.getElementById('hs-spin-plus').addEventListener('click', function() {
      var idx = HS_SPIN_OPTIONS.indexOf(hsState.spins);
      if (idx < HS_SPIN_OPTIONS.length - 1) { hsState.spins = HS_SPIN_OPTIONS[idx + 1]; renderHyperSpinPanel(); }
    });

    document.getElementById('hs-superbet-toggle').addEventListener('click', function() {
      hsState.superBet = !hsState.superBet;
      renderHyperSpinPanel();
    });
    document.getElementById('hs-scatter-toggle').addEventListener('click', function() {
      hsState.stopAtScatter = !hsState.stopAtScatter;
      renderHyperSpinPanel();
    });
    document.getElementById('hs-scatter-info').addEventListener('click', function() {
      dispatch('hyperSpinScatterInfo', {});
    });
    document.getElementById('hs-play').addEventListener('click', function() {
      closeHyperSpinPanel();
      dispatch('hyperSpinStart', {
        bet:           hsState.bet,
        spins:         hsState.spins,
        superBet:      hsState.superBet,
        stopAtScatter: hsState.stopAtScatter,
      });
    });
  }

  function onRocket() { openHyperSpinPanel(); }
