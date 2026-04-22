  /* ── Settings panel ── */
  var settingsState = { spinSpeed: 'fast', sfx: true, music: true, favorite: false };

  function openSettings() {
    renderSettings();
    document.getElementById('settings-overlay').classList.add('open');
  }
  function closeSettings() {
    document.getElementById('settings-overlay').classList.remove('open');
  }
  function renderSettings() {
    document.querySelectorAll('#settings-panel .sp-speed-zone').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.spd === settingsState.spinSpeed);
    });
    var sfxEl = document.getElementById('sp-sfx-toggle');
    var musEl = document.getElementById('sp-music-toggle');
    if (settingsState.sfx)   sfxEl.classList.add('on'); else sfxEl.classList.remove('on');
    if (settingsState.music) musEl.classList.add('on'); else musEl.classList.remove('on');
    var favImg = document.getElementById('sp-favorite-img');
    if (favImg) favImg.src = settingsState.favorite
      ? 'images/SETTINGS_ACTION_FAVORITE_ICON_ACTIVE.png'
      : 'images/FAVORITE.png';
  }
  function initSettings() {
    document.getElementById('sp-close').addEventListener('click', closeSettings);
    document.getElementById('settings-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeSettings();
    });
    document.querySelectorAll('#settings-panel .sp-speed-zone').forEach(function(btn) {
      btn.addEventListener('click', function() {
        settingsState.spinSpeed = this.dataset.spd;
        renderSettings();
        dispatch('settingsSpeedChange', { speed: settingsState.spinSpeed });
      });
    });
    document.getElementById('sp-sfx-toggle').addEventListener('click', function() {
      settingsState.sfx = !settingsState.sfx;
      renderSettings();
      dispatch('settingsSfxChange', { on: settingsState.sfx });
    });
    document.getElementById('sp-music-toggle').addEventListener('click', function() {
      settingsState.music = !settingsState.music;
      renderSettings();
      dispatch('settingsMusicChange', { on: settingsState.music });
    });
    document.getElementById('sp-history').addEventListener('click',    function() { closeSettings(); dispatch('menuHistory',    {}); });
    document.getElementById('sp-fullscreen').addEventListener('click', function() { closeSettings(); dispatch('menuFullscreen', {}); });
    document.getElementById('sp-howtoplay').addEventListener('click',  function() { closeSettings(); dispatch('menuHowToPlay',  {}); });
    document.getElementById('sp-favorite').addEventListener('click', function() {
      settingsState.favorite = !settingsState.favorite;
      renderSettings();
      dispatch('settingsFavoriteChange', { on: settingsState.favorite });
    });
  }

  function onMenu() { openSettings(); }
