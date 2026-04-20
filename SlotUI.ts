/**
 * SlotUI.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * 框架無關的 Slot 遊戲控制 UI 橋接器
 *
 *   ● PixiJS / 純 Web  → new SlotUI()，呼叫 .init()
 *   ● Cocos Creator 3.x → 見檔案底部 Cocos 範例，複製至你的 Cocos 專案使用
 *
 * 檔案放置（Web build 輸出根目錄下）：
 *   slot-ui/
 *   ├── slot-control.html
 *   └── images/
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── 事件名稱常數 ────────────────────────────────────────────────────────────

/** UI → 遊戲：玩家操作觸發 */
export const SC_EVENT = {
  SPIN:          'slotControl:spin',
  SPIN_STOP:     'slotControl:spinStop',
  BET_CHANGE:    'slotControl:betChange',
  SPEED_CHANGE:  'slotControl:speedChange',
  AUTO_OPEN:       'slotControl:autoSpinOpen',
  AUTO_SPIN_START: 'slotControl:autoSpinStart',
  AUTO_SPIN_STOP:  'slotControl:autoSpinStop',
  ROCKET_OPEN:   'slotControl:rocketSpinOpen',
  HYPER_SPIN:    'slotControl:hyperSpin',
  MENU_OPEN:             'slotControl:menuOpen',
  SETTINGS_SPEED_CHANGE: 'slotControl:settingsSpeedChange',
  SETTINGS_SFX_CHANGE:   'slotControl:settingsSfxChange',
  SETTINGS_MUSIC_CHANGE: 'slotControl:settingsMusicChange',
  MENU_HISTORY:          'slotControl:menuHistory',
  MENU_FULLSCREEN:       'slotControl:menuFullscreen',
  MENU_HOW_TO_PLAY:      'slotControl:menuHowToPlay',
  MENU_FAVORITE:         'slotControl:menuFavorite',
  LAYOUT_CHANGE:         'slotControl:layoutChange',
} as const;

/** 遊戲 → UI：更新顯示數值 */
export const SC_SET = {
  BALANCE:      'slotControl:setBalance',
  TOTAL_WIN:    'slotControl:setTotalWin',
  TOTAL_BET:    'slotControl:setTotalBet',
  BET_STEP:     'slotControl:setBetStep',
  BET_RANGE:    'slotControl:setBetRange',
  SPINNING:     'slotControl:setSpinning',
  SPEED_MODE:   'slotControl:setSpeedMode',
  AUTO_SPINNING:'slotControl:setAutoSpinning',
} as const;

// ── 型別定義 ────────────────────────────────────────────────────────────────

export interface SpinDetail       { bet: number; speed: 'normal' | 'fast' | 'turbo'; }
export interface SpinStopDetail   { bet: number; }
export interface BetChangeDetail  { totalBet: number; direction: 'up' | 'down' | 'select'; }
export interface SpeedDetail      { mode: string; modeIndex: 0 | 1 | 2; }
export interface HyperSpinDetail  { bet: number; spins: number; }
export interface LayoutDetail     { layout: 'portrait' | 'landscape'; width: number; height: number; }

// ── 核心橋接器（框架無關）──────────────────────────────────────────────────

export class SlotUI {

  /** slot-control.html 路徑（相對於 HTML 輸出根目錄） */
  public htmlPath: string = './slot-ui/slot-control.html';

  private _container: HTMLDivElement | null = null;
  private _listeners: Array<[string, EventListener]> = [];

  // ── 生命週期 ──────────────────────────────────────────────────────────────

  /**
   * 啟動方向偵測並注入 UI。
   * - PixiJS：在 app / renderer 建立後呼叫
   * - Cocos：在 onLoad() 或 start() 內呼叫
   */
  public init(): void {
    this._applyOrientation();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onOrientationChange);
    document.addEventListener('fullscreenchange',       this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    this._injectUI();
  }

  /**
   * 移除監聽器並清除 DOM。
   * - PixiJS：場景切換 / app 銷毀時呼叫
   * - Cocos：在 onDestroy() 內呼叫
   */
  public destroy(): void {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onOrientationChange);
    document.removeEventListener('fullscreenchange',       this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    this._listeners.forEach(([evt, fn]) => window.removeEventListener(evt, fn));
    this._container?.remove();
    this._container = null;
  }

  // ── 方向偵測 ──────────────────────────────────────────────────────────────

  private _applyOrientation(): void {
    const p = window.innerWidth < window.innerHeight;
    document.body.classList.toggle('is-portrait',  p);
    document.body.classList.toggle('is-landscape', !p);
  }

  private _onResize = (): void => this._applyOrientation();
  private _onOrientationChange = (): void => setTimeout(() => this._applyOrientation(), 50);

  // ── 全螢幕：把 UI container 移進 / 移出 fullscreen element ──────────────
  // 原因：browser fullscreen 只顯示 fullscreenElement 內的 DOM，
  //       slot-ctrl-root 掛在 document.body 時全螢幕後會消失
  private _onFullscreenChange = (): void => {
    if (!this._container) return;
    const fsEl = (document as any).fullscreenElement
               ?? (document as any).webkitFullscreenElement
               ?? null;
    if (fsEl) {
      // 進入全螢幕：移到 fullscreen element 內，並確保定位正確
      fsEl.appendChild(this._container);
    } else {
      // 退出全螢幕：移回 body
      document.body.appendChild(this._container);
    }
    // 重新套用方向
    setTimeout(() => this._applyOrientation(), 50);
  };

  // ── UI 注入 ───────────────────────────────────────────────────────────────

  private _injectUI(): void {
    // ── CSS ──────────────────────────────────────────────────────────────────
    if (!document.querySelector('style[data-from="slot-control"]')) {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('data-from', 'slot-control');
      styleEl.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-tap-highlight-color: transparent; }

    

    /* ── Shared button reset ── */
    button {
      background: none;
      border: none;
      cursor: pointer;
      outline: none;
      padding: 0;
      -webkit-user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform 0.1s ease, filter 0.1s ease;
    }
    button:active { transform: scale(0.90); filter: brightness(1.3); }

    /* ── Label / Value  (基準：直式 720×1280) ── */
    .lbl { font-size: 12px; color: rgba(255,255,255,0.50); text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
    .val { font-size: 16px; color: #ffffff; font-weight: bold; letter-spacing: 0.2px; white-space: nowrap; }
    .val.bet { color: #f7d12e; }

    /* ── Icon button  (直式基準 46px ≈ 720×6.4%) ── */
    .ibtn { width: 46px; height: 46px; }
    .ibtn img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; }

    /* Auto spin running badge */
    .auto-badge {
      position: absolute;
      bottom: 0px; right: 0px;
      min-width: 17px; height: 17px;
      border-radius: 9px;
      background: #00c8a0;
      color: #000;
      font-size: 9px;
      font-weight: 900;
      display: none; align-items: center; justify-content: center;
      pointer-events: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.6);
      padding: 0 3px;
    }
    .auto-spinning .auto-badge { display: flex; }
    .auto-spinning img { filter: brightness(1.4) hue-rotate(120deg); }

    /* Speed mode badge */
    .speed-badge {
      position: absolute;
      bottom: 0px; right: 0px;
      width: 17px; height: 17px;
      border-radius: 50%;
      background: #aaaaaa;
      color: #000;
      font-size: 9px;
      font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      pointer-events: none;
      box-shadow: 0 1px 3px rgba(0,0,0,0.6);
      transition: background 0.2s;
    }

    /* ── Bet ± buttons  (直式基準 50px ≈ 720×6.9%) ── */
    .bbtn { width: 50px; height: 50px; }
    .bbtn img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; }

    /* ── SPIN button  (直式基準 90px ≈ 720×12.5%) ── */
    .spin-btn { width: 90px; height: 90px; }
    .spin-btn img { width: 100%; height: 100%; display: block; object-fit: contain; pointer-events: none; }

    /* spinning state – spin 結束前完全鎖住，不可再按 */
    .spin-btn.spinning { pointer-events: none; }
    .spin-btn.spinning img { filter: brightness(0.5); }

    /* auto spin running – spin button locked */
    .spin-btn.auto-locked { pointer-events: none; }
    .spin-btn.auto-locked img { filter: brightness(0.35) saturate(0); }

    /* bet value flash */
    @keyframes flash-gold { 0%,100%{ color:#f7d12e } 40%{ color:#fff } }
    .flash { animation: flash-gold 0.3s ease; }

    /* ── Settings Panel ── */
    #settings-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 99998;
    }
    #settings-overlay.open {
      display: block;
      background: rgba(0,0,0,0.82);
    }

    #settings-panel {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #1c1c1c;
      border-radius: 12px;
      width: 230px;
      max-width: 88vw;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    }

    /* title */
    .sp-title-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .sp-title-bar span {
      font-size: 13px; font-weight: 800; color: #fff;
      text-transform: uppercase; letter-spacing: 2px;
    }
    .sp-close {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(255,255,255,0.12);
      font-size: 13px; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border: none; flex-shrink: 0;
    }
    .sp-close:active { background: rgba(255,255,255,0.28); }

    /* section */
    .sp-section {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex; flex-direction: column; gap: 8px;
    }
    .sp-section-label {
      font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45);
      text-transform: uppercase; letter-spacing: 1.5px;
    }

    /* speed pills (reuse ap-speed-btn style) */
    .sp-speed-row { display: flex; gap: 5px; }
    .sp-speed-btn {
      flex: 1; height: 30px; border-radius: 16px;
      border: 1.5px solid rgba(255,255,255,0.2);
      background: transparent; color: rgba(255,255,255,0.45);
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      cursor: pointer; transition: all 0.15s;
    }
    .sp-speed-btn.active { background: #fff; color: #000; border-color: #fff; }
    .sp-speed-btn:active { filter: brightness(0.85); transform: scale(0.96); }

    /* toggle row */
    .sp-toggle-row {
      display: flex; align-items: center; justify-content: space-between;
    }
    .sp-toggle-label { font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
    .sp-toggle-track {
      width: 40px; height: 22px; border-radius: 11px;
      background: rgba(255,255,255,0.15);
      position: relative; cursor: pointer; transition: background 0.2s; flex-shrink: 0;
    }
    .sp-toggle-track.on { background: #2979ff; }
    .sp-toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #fff; transition: transform 0.2s; pointer-events: none;
    }
    .sp-toggle-track.on .sp-toggle-thumb { transform: translateX(18px); }

    /* bottom icon buttons */
    .sp-icon-row {
      display: flex; justify-content: space-around;
      padding: 12px 8px 14px;
    }
    .sp-icon-btn {
      display: flex; flex-direction: column; align-items: center; gap: 5px;
      background: none; border: none; cursor: pointer;
    }
    .sp-icon-btn svg { width: 24px; height: 24px; opacity: 0.75; }
    .sp-icon-btn span { font-size: 9px; color: rgba(255,255,255,0.6); font-weight: 600; letter-spacing: 0.5px; }
    .sp-icon-btn:active svg { opacity: 1; }

    /* ── Hyper Spin Panel ── */
    #hs-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 99999;
    }
    #hs-overlay.open {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.82);
    }

    #hs-panel {
      background: #1a1a2e;
      border-radius: 18px;
      padding: 0 0 20px;
      width: 300px;
      max-width: 92vw;
      box-sizing: border-box;
      flex-shrink: 0;        /* prevent flex compression */
      display: block;
      box-shadow: 0 12px 40px rgba(0,0,0,0.8);
      overflow: hidden;
    }

    /* title bar */
    .hs-title-bar {
      background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 60%, #43a047 100%);
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px 12px;
    }
    .hs-title-badge {
      display: flex; align-items: center; gap: 7px;
      background: rgba(0,0,0,0.25);
      border-radius: 20px;
      padding: 5px 12px 5px 8px;
    }
    .hs-title-badge .hs-rocket-icon { font-size: 17px; line-height: 1; }
    .hs-title-badge span { font-size: 13px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 2px; }
    .hs-close {
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,0.18);
      font-size: 13px; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border: none; flex-shrink: 0;
    }
    .hs-close:active { background: rgba(255,255,255,0.35); }

    /* rows — .hs-rows is transparent to layout; rows become direct children of #hs-panel */
    .hs-rows { display: contents; }
    .hs-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .hs-row:last-child { border-bottom: none; }

    .hs-row-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .hs-row-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1.5px; }
    .hs-row-sub   { font-size: 9px;  color: rgba(255,255,255,0.30); text-transform: uppercase; letter-spacing: 1px; }

    /* counter */
    .hs-counter { display: flex; align-items: center; gap: 10px; }
    .hs-counter-btn {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.18);
      color: #fff; font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      line-height: 1; flex-shrink: 0;
      transition: background 0.12s;
    }
    .hs-counter-btn:active { background: rgba(255,255,255,0.22); transform: scale(0.9); }
    .hs-counter-val { font-size: 15px; font-weight: 800; color: #fff; min-width: 72px; text-align: center; }

    /* toggle */
    .hs-toggle-right { display: flex; align-items: center; gap: 8px; }
    .hs-info-btn {
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(255,255,255,0.12); border: none;
      color: rgba(255,255,255,0.6); font-size: 11px; font-weight: 900;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .hs-toggle-track {
      width: 44px; height: 24px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      position: relative; cursor: pointer;
      transition: background 0.2s; flex-shrink: 0;
    }
    .hs-toggle-track.on { background: #43a047; }
    .hs-toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #fff; transition: transform 0.2s; pointer-events: none;
    }
    .hs-toggle-track.on .hs-toggle-thumb { transform: translateX(20px); }

    /* saldo row */
    .hs-saldo {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      padding: 12px 18px 0;
    }
    .hs-saldo-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 1.5px; }
    .hs-saldo-val   { font-size: 14px; font-weight: 800; color: #81c784; letter-spacing: 0.5px; }

    /* play button */
    .hs-play-wrap {
      display: flex; justify-content: center;
      padding: 16px 0 4px;
    }
    .hs-play-btn {
      width: 64px; height: 64px; border-radius: 50%;
      background: radial-gradient(circle at 38% 38%, #66bb6a, #2e7d32);
      border: 3px solid #a5d6a7;
      box-shadow: 0 4px 18px rgba(46,125,50,0.6);
      color: #fff; font-size: 26px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: filter 0.12s, transform 0.12s;
      padding-left: 4px; /* optical center for ▶ */
    }
    .hs-play-btn:active { filter: brightness(0.82); transform: scale(0.93); }

    /* ── Auto Play Panel ── */
    #auto-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 99998;
    }
    #auto-overlay.open {
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.82);
    }

    #auto-panel {
      background: #1a1a1a;
      border-radius: 14px;
      padding: 22px 24px 20px;
      width: 320px;
      max-width: 90vw;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    }

    /* title row */
    .ap-title {
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .ap-title span {
      font-size: 15px; font-weight: 800; color: #fff;
      text-transform: uppercase; letter-spacing: 2px;
    }
    .ap-close {
      position: absolute; right: 0; top: 50%; transform: translateY(-50%);
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.12);
      font-size: 16px; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border: none; line-height: 1;
    }
    .ap-close:active { background: rgba(255,255,255,0.28); transform: translateY(-50%); }

    /* section label */
    .ap-section-label {
      font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.45);
      text-transform: uppercase; letter-spacing: 1.5px;
      margin-bottom: 8px;
    }

    /* speed selector */
    .ap-speed-row {
      display: flex; gap: 6px;
    }
    .ap-speed-btn {
      flex: 1; height: 36px; border-radius: 20px;
      border: 1.5px solid rgba(255,255,255,0.2);
      background: transparent; color: rgba(255,255,255,0.5);
      font-size: 11px; font-weight: 700; letter-spacing: 1px;
      cursor: pointer; transition: all 0.15s;
    }
    .ap-speed-btn.active {
      background: #fff; color: #000;
      border-color: #fff;
    }
    .ap-speed-btn:active { filter: brightness(0.85); transform: scale(0.96); }

    /* counter row */
    .ap-row {
      display: flex; align-items: center; justify-content: space-between;
    }
    .ap-row-label {
      font-size: 13px; font-weight: 700; color: #fff;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .ap-counter {
      display: flex; align-items: center; gap: 12px;
    }
    .ap-counter-btn {
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.1); border: none;
      color: #fff; font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      line-height: 1;
    }
    .ap-counter-btn:active { background: rgba(255,255,255,0.25); transform: scale(0.9); }
    .ap-counter-val {
      font-size: 17px; font-weight: 800; color: #fff;
      min-width: 56px; text-align: center;
    }

    /* until feature toggle */
    .ap-toggle-track {
      width: 44px; height: 24px; border-radius: 12px;
      background: rgba(255,255,255,0.15);
      position: relative; cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }
    .ap-toggle-track.on { background: #00c8a0; }
    .ap-toggle-thumb {
      position: absolute; top: 3px; left: 3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #fff;
      transition: transform 0.2s;
      pointer-events: none;
    }
    .ap-toggle-track.on .ap-toggle-thumb { transform: translateX(20px); }

    /* start button */
    .ap-start {
      width: 100%; height: 48px; border-radius: 10px;
      background: #00c8a0; border: none;
      color: #000; font-size: 14px; font-weight: 900;
      letter-spacing: 2px; text-transform: uppercase;
      cursor: pointer; transition: filter 0.15s;
    }
    .ap-start:active { filter: brightness(0.85); transform: scale(0.98); }

    /* ═══════════════════════════════════════════════
       PORTRAIT LAYOUT
    ═══════════════════════════════════════════════ */
    /* ── PORTRAIT  720 × 1280 ── */
    #portrait {
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      background: rgba(0,0,0,0.75);
      border-top: 1px solid rgba(255,255,255,0.12);
      padding: 12px 22px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* info row */
    #portrait .p-info {
      display: flex;
      justify-content: space-around;
      align-items: center;
      width: 100%;
      padding: 2px 0;
    }
    #portrait .p-info .info-block {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: #000;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px;
      padding: 6px 18px;
      min-width: 150px;
    }
    #portrait .p-info .sep { display: none; }

    /* controls row */
    #portrait .p-controls {
      display: flex;
      align-items: center;
      width: 100%;
      overflow: visible;
      padding-bottom: 4px;
    }

    /* 左右 side 各佔一份，中間 p-center 自然置中 */
    #portrait .p-side { display: flex; flex-direction: column; gap: 12px; flex: 1; }
    #portrait .p-side:last-child { align-items: flex-end; }

    /* center: - spin + */
    #portrait .p-center { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; }


    /* ═══════════════════════════════════════════════
       LANDSCAPE  1280 × 720
       bar 高 ≈ 720 × 12.5% = 90px
       spin   ≈ 720 × 8.9%  = 64px
       ibtn   ≈ 720 × 5.8%  = 42px
       bbtn   ≈ 720 × 6.1%  = 44px
    ═══════════════════════════════════════════════ */
    #landscape {
      width: 100%;
      background: rgba(0,0,0,0.75);
      border-top: 1px solid rgba(255,255,255,0.12);
      padding: 0 24px;
      height: 90px;
      display: flex;
      align-items: center;
      gap: 14px;
      overflow: visible;
    }

    #landscape .l-group { display: flex; align-items: center; gap: 10px; }
    #landscape .l-info {
      display: flex;
      flex: 1;
      justify-content: center;
      align-items: center;
      gap: 24px;
    }
    #landscape .info-block {
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      background: #000;
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px;
      padding: 5px 16px;
      min-width: 120px;
    }
    #landscape .sep { display: none; }

    /* Landscape sizes */
    #landscape .spin-btn { width: 64px; height: 64px; }
    #landscape .bbtn     { width: 44px; height: 44px; }
    #landscape .ibtn     { width: 42px; height: 42px; }
    #landscape .speed-badge { width: 14px; height: 14px; font-size: 8px; bottom: 0; right: 0; }
    #landscape .lbl { font-size: 10px; }
    #landscape .val { font-size: 14px; }

    /* ── Visibility：由 JS 依 innerWidth < innerHeight 動態切換 class ── */
    /* 預設顯示直式（JS 執行前的 fallback） */
    #portrait  { display: flex; }
    #landscape { display: none; }
    /* JS 加上 class 後才生效 */
    body.is-landscape #portrait  { display: none !important; }
    body.is-landscape #landscape { display: flex !important; }
    body.is-portrait  #portrait  { display: flex !important; }
    body.is-portrait  #landscape { display: none !important; }
  `;
      document.head.appendChild(styleEl);
    }

    // ── HTML（圖片已內嵌為 base64，無需外部檔案）────────────────────────────
    this._container = document.createElement('div');
    this._container.id = 'slot-ctrl-root';
    Object.assign(this._container.style, {
      position: 'fixed', left: '0', bottom: '0',
      width: '100%', zIndex: '9999', pointerEvents: 'auto',
    });
    this._container.innerHTML = `<!-- ═══════════════════ SETTINGS PANEL ════════════ -->
<div id="settings-overlay">
  <div id="settings-panel">

    <!-- Title -->
    <div class="sp-title-bar">
      <span>Settings</span>
      <button class="sp-close" id="sp-close">✕</button>
    </div>

    <!-- Spin Animation -->
    <div class="sp-section">
      <div class="sp-section-label">Spin Animation</div>
      <div class="sp-speed-row">
        <button class="sp-speed-btn active" data-spd="normal">⊙ Normal</button>
        <button class="sp-speed-btn"        data-spd="fast">⚡ Fast</button>
        <button class="sp-speed-btn"        data-spd="turbo">⚡ Turbo</button>
      </div>
    </div>

    <!-- Sound Effect -->
    <div class="sp-section">
      <div class="sp-toggle-row">
        <span class="sp-toggle-label">Sound Effect</span>
        <div class="sp-toggle-track" id="sp-sfx-toggle">
          <div class="sp-toggle-thumb"></div>
        </div>
      </div>
    </div>

    <!-- Music -->
    <div class="sp-section">
      <div class="sp-toggle-row">
        <span class="sp-toggle-label">Music</span>
        <div class="sp-toggle-track on" id="sp-music-toggle">
          <div class="sp-toggle-thumb"></div>
        </div>
      </div>
    </div>

    <!-- Icon Buttons -->
    <div class="sp-icon-row">
      <button class="sp-icon-btn" id="sp-history">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/>
        </svg>
        <span>History</span>
      </button>
      <button class="sp-icon-btn" id="sp-fullscreen">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
          <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
        </svg>
        <span>Full Screen</span>
      </button>
      <button class="sp-icon-btn" id="sp-howtoplay">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"/>
          <path d="M9.5 9a3 3 0 0 1 5.2 2c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12" y2="17.5"/>
        </svg>
        <span>How to Play</span>
      </button>
      <button class="sp-icon-btn" id="sp-favorite">
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>
        </svg>
        <span>Favorite</span>
      </button>
    </div>

  </div>
</div>

<!-- ═══════════════════ HYPER SPIN PANEL ══════════ -->
<div id="hs-overlay">
  <div id="hs-panel">

    <!-- Title bar -->
    <div class="hs-title-bar">
      <div class="hs-title-badge">
        <span class="hs-rocket-icon">🚀</span>
        <span>Hyper Spin</span>
      </div>
      <button class="hs-close" id="hs-close">✕</button>
    </div>

    <!-- Body rows -->
    <div class="hs-rows">

      <!-- TARUHAN / BET -->
      <div class="hs-row">
        <div class="hs-row-left">
          <span class="hs-row-label">Taruhan</span>
          <span class="hs-row-sub">Bet</span>
        </div>
        <div class="hs-counter">
          <button class="hs-counter-btn" id="hs-bet-minus">−</button>
          <span class="hs-counter-val" id="hs-bet-val">$ 1,000.0</span>
          <button class="hs-counter-btn" id="hs-bet-plus">+</button>
        </div>
      </div>

      <!-- PUTARAN / SPINS -->
      <div class="hs-row">
        <div class="hs-row-left">
          <span class="hs-row-label">Putaran</span>
          <span class="hs-row-sub">Spins</span>
        </div>
        <div class="hs-counter">
          <button class="hs-counter-btn" id="hs-spin-minus">−</button>
          <span class="hs-counter-val" id="hs-spin-val">10</span>
          <button class="hs-counter-btn" id="hs-spin-plus">+</button>
        </div>
      </div>

      <!-- SUPER BET -->
      <div class="hs-row">
        <div class="hs-row-left">
          <span class="hs-row-label">Super Bet</span>
        </div>
        <div class="hs-toggle-track" id="hs-superbet-toggle">
          <div class="hs-toggle-thumb"></div>
        </div>
      </div>

      <!-- BERHENTI DI SCATTER -->
      <div class="hs-row">
        <div class="hs-row-left">
          <span class="hs-row-label">Berhenti Di Scatter</span>
          <span class="hs-row-sub">Stop At Scatter</span>
        </div>
        <div class="hs-toggle-right">
          <button class="hs-info-btn" id="hs-scatter-info">i</button>
          <div class="hs-toggle-track" id="hs-scatter-toggle">
            <div class="hs-toggle-thumb"></div>
          </div>
        </div>
      </div>

    </div><!-- /hs-rows -->

    <!-- SALDO / BALANCE -->
    <div class="hs-saldo">
      <span class="hs-saldo-label">Saldo</span>
      <span class="hs-saldo-val" id="hs-saldo-val">$ 0.0</span>
    </div>

    <!-- Play button -->
    <div class="hs-play-wrap">
      <button class="hs-play-btn" id="hs-play">▶</button>
    </div>

  </div>
</div>

<!-- ═══════════════════ AUTO PLAY PANEL ═══════════ -->
<div id="auto-overlay">
  <div id="auto-panel">

    <!-- Title -->
    <div class="ap-title">
      <span>Auto Play</span>
      <button class="ap-close" id="ap-close">✕</button>
    </div>

    <!-- Speed -->
    <div>
      <div class="ap-section-label">Auto Play Spin Animation</div>
      <div class="ap-speed-row">
        <button class="ap-speed-btn active" data-speed="normal">Normal</button>
        <button class="ap-speed-btn"        data-speed="fast">⚡ Fast</button>
        <button class="ap-speed-btn"        data-speed="turbo">⚡ Turbo</button>
      </div>
    </div>

    <!-- Bet -->
    <div class="ap-row">
      <span class="ap-row-label">Bet</span>
      <div class="ap-counter">
        <button class="ap-counter-btn" id="ap-bet-minus">−</button>
        <span class="ap-counter-val" id="ap-bet-val">10.0</span>
        <button class="ap-counter-btn" id="ap-bet-plus">+</button>
      </div>
    </div>

    <!-- Spins -->
    <div class="ap-row">
      <span class="ap-row-label">Spin</span>
      <div class="ap-counter">
        <button class="ap-counter-btn" id="ap-spin-minus">−</button>
        <span class="ap-counter-val" id="ap-spin-val">10</span>
        <button class="ap-counter-btn" id="ap-spin-plus">+</button>
      </div>
    </div>

    <!-- Until Feature -->
    <div class="ap-row">
      <span class="ap-row-label">Until Feature</span>
      <div class="ap-toggle-track" id="ap-feature-toggle">
        <div class="ap-toggle-thumb"></div>
      </div>
    </div>

    <!-- Start -->
    <button class="ap-start" id="ap-start">Start</button>

  </div>
</div>

<!-- ═══════════════════ PORTRAIT ═══════════════════ -->
<div id="portrait">

  <!-- Info row -->
  <div class="p-info">
    <div class="info-block">
      <span class="lbl">Balance</span>
      <span class="val" id="p-balance">$ 128,890,800.0</span>
    </div>
    <div class="sep"></div>
    <div class="info-block">
      <span class="lbl">Total Bet</span>
      <span class="val bet" id="p-bet">$ 10.0</span>
    </div>
    <div class="sep"></div>
    <div class="info-block">
      <span class="lbl">Total Win</span>
      <span class="val" id="p-win">$ 128,890,800.0</span>
    </div>
  </div>

  <!-- Controls row -->
  <div class="p-controls">

    <!-- Left: Speed (top) + Auto Spin (bottom) -->
    <div class="p-side">
      <button class="ibtn" id="p-speed" title="Spin Speed">
        <img src="data:image/png;base64,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" alt="Speed" draggable="false">
        <span class="speed-badge" id="p-speed-badge">1</span>
      </button>
      <button class="ibtn" id="p-auto" title="Auto Spin">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAYAAABxlTA0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAE7RJREFUeAHtXXlwFFUefklmMgm5gByYECIgJEggQRKIFkUJeAJVAQtRuZRjuVYtqlwKtSwt2FUX2bJ212I5BYTlCFqWxY1/CAFBVBIQ5Eo4EjkC4Qi572T2+9p+sTNMkjm6J4HsV9Xpa7r79de/93u/470XL9GGMHXq1D5Y9fHx8YnDOshqtXI/SC5eAI5Z1Z+XqEselmJvb+9zdXV1WTid98UXX5wTbQReohUBQgeZTKZkEDMI3EkymwS5xe+E5Jjb9s5hTeLPYXsflozWJNzjBJNUrEZA4sbg5RVCtaSVl5fX37lzp7asrKyutLS0vqqqyop1nb17+fr6egUFBfkEBgZ6h4aG4luZvDp16mSS9yR4X0o1asVRfMiNnibbIwRPnz6d1X1MfX09iR2EtcBacH3r1q2agoKC2suXL1eTWBIq3IDFYvEi2Q8//LBvly5dzCEhISb5LK5RjiyQ/99169ZtEx6AoQSrxE7G5hS8oCKtfMn8/PyaK1euVGdnZ1e6S2hLgIR7R0ZG+vbq1ctCwjUfNw9lW7ZhwwZDiTaM4FdffXUyJOXPQtWrNTU11pycnMrffvutOi8vr0a0Akj2Y4891qFHjx5+3Ff1taFE607wpEmT2HDNRaHZcFlJ7NmzZyvPnDlTYbS0OgoSDYn2o1R36NDBG2WlgUI9PW3t2rV5QkfoRjDVARoREjtFbWCsWVlZlcePHy9vK8TaQkp09+7d/VQLkEQvW79+/XKhE3Qh+JVXXolCi74WBYzi/u3bt2sPHTpUAtSL+wAkevjw4cGwQHy4T6ujurp6elpamtvS7CPcBHTtGDQa/8ZmWG1trRUSW3HkyJFSFLBNSq09sKysbaiB1oceesgXh4KgLsYMGDCg+sSJEyeFG3CL4MmTJ1MlLMCmpaKiom7Pnj1F165da5UGTA/cvHmz9tKlS1Uw8SxoR/zwbkOgQgRIzhAuwmWC0Zh9CH1FE0zAOqhKT08vgZNw30htU6A0k2Q2fnRa2FgnJiYGnTx58rBwAS4RPGHChA+hFlJp5pw+fbr86NGj5ahe4kEB34V2Ot7RKzw83IxDCf3794/69ddf9wsn4TTBlFwtub/88kuFeEBx48aNGuhihWTGSlwh2SmCQS717XhuP+jkSmhJxm6fhIQEp0h2mOCJEyfOxVecQcmF09AuyJUgyXSvJcmQZAGSHWr4HCIY5E7Cap5KbgVa1XZDrgTiJ7UkOSIigtG65Pj4+LxTp05ltXRdiwTTicCN/wFyfRFHqMrIyCgX7RQkmeHRjh07+qA2DwLJe0FySXPXeLd0U9xoDSJPgYjP1tNaEO0cmZmZZeSCsWxyk5qa2mySoFmCIb1zpPu7b9++YgZuRDsH4yrfffcduWAYICogIGBuc79vUkVQNWD1L+pd6Nzy1goxtkXQGSEvjC9jN6Ffv34ZUBV24xamZu6zhjcpKiqqY7hRtAL69Onjl5KSEtizZ08/ZiYY9eLx3NzcSpSLbm3lTz/9VHru3DmPl4+cREVFmcPCwszgiVI8w97v7EbTxo8fn4qG7W8MO+7cubOQuTHhIUCndZw2bVqXESNGhKFBMWkTnPa2ievXr1f+/PPPhci35W/fvr1QeAjMBY4ePbqjurtk69atm2x/Y5fgl156aQ91L9zFqh9//LFMGAzYl6Z33323KxKi0WylbQlUy9n4wL2/UQCyqz799NPcb7/9tsgTkp2UlNSBNYyZ7MrKypH4wI2sint0MKUXqzGIjtVDKsqMDju+//77XTdu3Bg/ZMiQzogpM7ugJCgledpteU4et13zPKTK9Mwzz4SNHTs2FMdqoUIMFRDGvpkZgbfHpQZ+QiMH5B4JBsF7sIqiQwF32DCHIjY21u+rr77qi3UAiVEzvrb9GxSJRHK0tLi4uBY1SpFI6GNzdHS0BclMP17PY031lUB8uggqJ5sJVmEQ4Nn5o73wx7OLIcWjtFLcqJFTpTeSZaNTIQzC66+/3gWS24M6FlKmMKONxh07dqxoy5YtN6HT7lBCmrsXP9Szzz4bArUWkZycHCIlmiDBCJoHI07d/80338zevXt3kTAAVEWPPPKIBTUwCAs5bNDFjVRE3759/4pChVH3IsZbLQzAJ598EgN929NsNnurEqvkwri9adOmPDRyp5cuXXoDTk0ZO6G0dD/2paAqW7du3U3UiJto2X1QZQNlbeACW9X04osvdoHlUcX7aq/v3bu3BeHX0MLCwjr2zxAugB8V8WMvWjrYtcDC2C7PNdQnvFgcXnort/fu3VtEb0XoDJDbbfbs2TG2x1mNZ82adeH8+fO6VOO4uDjLtm3b+iP9Y7E9984775xfsWLFTW6T3P379w+Q1gps/1N8d+ECGKMYOnSo9Or+9PXXXyu6uMGTQ4qEAR2hdlvSnVy8WOTMmTO7UVypFrgQeNnLSDie0otcAvm1KujEDNYI7fO4fPzxx70GDx6s6G3o5ghIng9zcTyHoFaEcBFMN5E7bqM9GS6PNxAMBZ3MNYx43XUvW9m5c+dG8yWYGGWV4vbixYtzQPwVYRCg63OWLVt2hfqdzySRXKBO4jp37myS5eDC41Z7dp8TQD6SLh6fkyqPKQRTPdDuVfuKuaSHmsM333wTb7FYTFJSuF6yZEkuVMZ1YTDee++9K6tWrbosCeTz4X1Z0IjG4jQ/uJAfwE1+KZyy3QoCp4rAKlYE7DdlB6ZQnd7qYdGiRdF4IV++mDShVq9efQUEG06uBEi+CpPO8vzzz4fLTjEwrYJVUpUaxeP8CMINMBgGNVGD2mFWOc2QKmIYHwSTSNeADk0XfMkwtRoq1ZFu7QcffHBVeBjz58/PRWaiUqOTBdI/QbItUNfCXdAaUbsIKUKrEIx99ij30jtiNnny5LDQ0FCLRjXQ1j4rWgEwweoWLFhwSaoEksC1XKQuFm4CAqRwiNtTBQmTqn9pXljJvtARo0aNClPtXOWZiA/cvnjxosONaI8ePSzscyFcBPs1sO+Z3KfUsgYhzGix93utk+Iq7t69q3BITsktOyfTc1P0r54B9RdeeKEjgji+WqmA3r3myLUkdvPmzXEkAmmaajRS19Dy3xZOgEEYRNf6wMnwsXWftbpAuuSEHgSTQ8Zx/Pz8vHHfWHpTlGChdw/Ip59+upO0GLgcPHiw0FHpnTNnTgQ/Dq9jJheNVPfDhw8nkHjhIHBNN76kLAPNQ6mq5LbWqtHDTJNgDF3djCPBfXhfSrDQEYmJiYFaHYc0y11Hr4Xxb9LYrspCSwReVn+40Yi7d2+RaMQHyrXXN7WtXRCaLRE6QM3ZcVNxEQNZRSjWQicgwNIBjVsj9bBjxw6HCdY2OCybNKO4IBAf+sQTT3RE3CEfjkqTpt7nn3+ez56ScHL8tWqAsI3YcY3aVYHkgsNlbA4yhoJyx9EOVhwMRwIrjiImJsZXNm58gQsXLlRI5e8IrH9Ae6wh6M6qP2XKlMjnnnsuFEReh0t8x/YeSCdVT58+/aJoBUhvFe8e5K1aEELPwDqCLf6yKkLpsz+BU5aAvI4mFbe5ZqHVtVBtagGD3hem18NoEHtzVJFoI9A4a4Fs6QK5pa1C7oK5KpUQRQxhXztFsDZAI++hDRDJRkoef/TRRwMRPYtHRC5ctCGgeMHe0kbVqQFV4O/v7yNfnkRoWlWHIA1/CXvb2giZXODYPCTaDkio1SQMgBpRUr4a+9g6+/GkrQrSGkamaM5ZtQMLCbnd1IjQ1oC0qU3aguoFvGitDJxQsiDRTj1AtVuFSi4PNfpCtolOaWnAjCsQbQjklRJcIkdh6gXGRaWZpaZsnOqHbP09e9zI29Ju27YXSM6WrV27Nv+HH34oFW0E6juU0A5moYIgZbq1ctS5WoLi4+MDnLleRt5sDsvyNZh/HOcM9/sKiDW874YzQOpNbpZQgouxRLIXt9AJ7Isgs8QkA0EXc3BwsI+j3qKMvMnrVWegQV3QZt+1a9ftDRs23HHVA0WC0hvWh78RHWukSuToUergbOiKOI6qETrh6tWr1dTDzHdxnyQ99dRTwchsOOQpSQm22swPwfWBAwcK16xZk4/Mt8uh1W7dupmXL1/ei+VjgHzGjBkX9AwV0BFiWWHLl4Jb7xLuONsQtQRIcbEmB2cFwSGOXsuPY2uOQc+Wvv322zkLFy686g65BO4Tzffl/ZmbQ9JV1zaItVW1drK8OQ0Ljlk5nFToiD179hRqPTGkyAMcfUZaWtodZGmraU3Q9Prss8+uvfHGG7ns/yDcRNeuXc0oi7+MoLFsMkiuF6BuhWpaZnGWkCzqOyQlvaGcvfSKCXNoKlzGWjod3OfzXn75ZcYObrV0LUeLTpgw4TzJ0Hvk6NSpU8O1cV+oiCo9PpwEOYQnSwmmYOV57969Oxs7SphOTymmTkNDVCAlhcvYsWPD2KfW0XvoTS6fjUhciDYWvHXr1hY/uDNg71CuwWkxQrTZktBs/lF7bOuGL7/8soBVXNvv4K233ooSrYSPPvooRhvToBrKzMzUddwJODSpFpAyAkkSnMGDDNIIHVFSUsIB4gVSFzNCxvjsa6+9FiY8DD6T5qKMxLEsEIDbeid65ZQIaODSlbV6PJN/2HmNOkToiPXr199mt1NtugbJwNBx48Z1Eh4CYsehfKZWXUH3VnN2AKEjaJlI0xQfUOFU2UE0/3rPnj0nYtPCRs7Z6FdLOHHiRNmTTz4ZTGdGDeSIfv36BeBF640e/4EIm0KujFtwoaOCnN1lvYdGUMWytz4286B/l/JYQ4wACcVQrPqRBL2rDV+EFgVSSQFqhIyHrX379g2AUc5hqYZ09J45c2Y4sh6drZqurHwunIzrZ86c0f3DItHgRycDm+nIqKTzWAPBSCRWw5RK5Q8KCwtrKysrdc0yM6PMieRkjkzm2WJjY/05nYsc4Cd0AHsUzZs3L3LgwIFBtsEh5AYLjOiITfUA+9pPDawvzMnJUdJYDQTn5uZSTSThfCR1JXSU7rFVSirsbaWh474kmjY4JK0j7F4Tp/1ylWgkOU1ozMKhFsLpoWldbC40G7ds2WJISJPSi6ghpTd73759q+TxRgF3FCIdqyQU1AyJq2aDJHQGX5CTJY0ePbqTdELk45OTk4O44EOUHz9+vJRBo5bI5kulpKQEDBkyJBiSq4yjU9NMylyi3GdtRGAo/8iRI4ZE3VjraZ5xG8/crD3XyGJAIYPw4+1MhHKMBkkWBoHSNn/+/K5yrkl7oNTduHGjih2bCwoKamTmm70XGZyCxFuaul6qBqbj6T3C5jVspCo7xEDF+jJ6BulN1Z67xySDPpyF1SyaMoyzGiHFWowcOTJk2LBhIdoq3Ry0k37a25eA1NYjw3HXqIEvEpRe9n/Dmo33wvT09J3a8/dkGiAVDF+OQ8E57svL1YEhjuLChQtVJ0+e5Hi8epKsdndqlAqyaoZ3aTtL2+5zqaiosEKKCleuXHnTCEvBFhznAf+BsYc8hFIX2Z6361TAZp2Awv+F2wxIUxqEhwAd3CExMZGjJ/05L4PmVENGw/Yakgp7uozztXmCVAkKw+OPPy6zNfdIL9Gk1waSV4LkpLt379a21gwn7EwSFhZm4nS1NINAuDJVLWsVu3pRN3NaXCOGPTgCmIEBDC9Q90J6U+39pskGBi+yCtVvBd3n6OhoX2YphIdBk42LaINgVkTGbqCiZjf1uyaDO/v376cvncZtSJJZ9VD+D/G7atB0pV31/fffN9kJsVnSIME0mDntq1dCQoI/p/AW7RzkgFyou3kHDx5c1dzvmyX48OHDzNfNZn6fZggaHoc7QD+o4Jg/coFNhZuWft9ihxA0IqUxMTF3cLNhMuOhd7TtfgEb3cjISLNqEv7n0KFDR1q6xqEeNyA5GyR7QZKTaPPR/mxvJLPPMxd1dzXIXe/IdQ53aQLJmWg5me6JZVqa5lJ7IZnE4t0VciFcaSB3qaPXOtVnDJmJA6gmDSS3B0m2IXcnyP27M9c7PfsqJPmAKsm9aSM/yCSTXPoA3MZ77kCj/1fhJFyaP5iSDJLZG6YfJFmJHzBNr8c4s7YAmmIM2vP/b3DfVXIJl2fABslHQDJb04GMydKl5XBVdwdUtzb4n2SQL/RXVSDNsVWIKv5TuAi35nAHycdAMru/MpfHL860uPV++e8DtkD5TUz7MLXFabogPIsRQEoTbkAXz2zo0KGRjFsw3cR9ZiE46whwXxBNqWXYkV2e1EPXzWbznOZcYEehq+uL0N1MrGbKfUa5ECSqaatEMwTAoA1TZJrDaTi+ml6s0AG6xxaSkpIi0Ug0SDP7WXAeCqRs6toK0SQ2KirKRGJlx3OotkzY9qsR/z4mdIRhwZvBgwePhh6bhSVSWheM37amRLPhYtcmdg7h6CceU/+532okWN3StU3B8OiYJJoSLfNm7BDICedg2tUbTTYlNCIigrNWm6SOVfN4bMTSUIY0tBe6qAN78Fj4kURjNcH6+0wgZFqxgtggspMgxzIza+yumUdCmXFGfs+HWRBNl1xlrDOeeQzLgcLCwl1GEis0D/UoUlJSekNlkOiB2I3UDDJUiAXhSidBks1ZppEPFE1lttn6c0QPZxGkaUV7nBOMij/ydl5qV/5SfLhd2E/PzMzUVce2hFYNoKtkD2QolLODYK0dN93wH2jtpeabSter50pxnNnxTBB7zNOkNiqLaENQCef0Cr1VwjkRPa0REq8MVJHpetURoJNTgu3z7KUPQrOxnY0G67xoI/gff3MBv0oqJYEAAAAASUVORK5CYII=" alt="Auto" draggable="false">
        <span class="auto-badge" id="p-auto-badge">0</span>
      </button>
    </div>

    <!-- Center: − SPIN + -->
    <div class="p-center">
      <button class="bbtn" id="p-minus" title="Decrease Bet">
        <img src="data:image/png;base64,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" alt="-" draggable="false">
      </button>
      <button class="spin-btn" id="p-spin" title="Spin">
        <img src="data:image/png;base64,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" alt="Spin" draggable="false">
      </button>
      <button class="bbtn" id="p-plus" title="Increase Bet">
        <img src="data:image/png;base64,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" alt="+" draggable="false">
      </button>
    </div>

    <!-- Right: Rocket (top) + More Options (bottom) -->
    <div class="p-side">
      <button class="ibtn" id="p-rocket" title="Rocket Spin">
        <img src="data:image/png;base64,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" alt="Rocket" draggable="false">
      </button>
      <button class="ibtn" id="p-menu" title="More Options">
        <img src="data:image/png;base64,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" alt="Menu" draggable="false">
      </button>
    </div>

  </div>
</div><!-- /portrait -->


<!-- ═══════════════════ LANDSCAPE ═══════════════════ -->
<div id="landscape">

  <!-- Left: Menu + Auto Spin -->
  <div class="l-group">
    <button class="ibtn" id="l-menu" title="More Options">
      <img src="data:image/png;base64,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" alt="Menu" draggable="false">
    </button>
    <button class="ibtn" id="l-auto" title="Auto Spin">
      <img src="data:image/png;base64,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" alt="Auto" draggable="false">
      <span class="auto-badge" id="l-auto-badge">0</span>
    </button>
  </div>

  <!-- Info -->
  <div class="l-info">
    <div class="info-block">
      <span class="lbl">Balance</span>
      <span class="val" id="l-balance">$ 128,890,800.0</span>
    </div>
    <div class="sep"></div>
    <div class="info-block">
      <span class="lbl">Total Bet</span>
      <span class="val bet" id="l-bet">$ 10.0</span>
    </div>
    <div class="sep"></div>
    <div class="info-block">
      <span class="lbl">Total Win</span>
      <span class="val" id="l-win">$ 128,890,800.0</span>
    </div>
  </div>

  <!-- − SPIN + -->
  <div class="l-group">
    <button class="bbtn" id="l-minus" title="Decrease Bet">
      <img src="data:image/png;base64,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" alt="-" draggable="false">
    </button>
    <button class="spin-btn" id="l-spin" title="Spin">
      <img src="data:image/png;base64,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" alt="Spin" draggable="false">
    </button>
    <button class="bbtn" id="l-plus" title="Increase Bet">
      <img src="data:image/png;base64,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" alt="+" draggable="false">
    </button>
  </div>

  <!-- Right: Speed + Rocket -->
  <div class="l-group">
    <button class="ibtn" id="l-speed" title="Spin Speed">
      <img src="data:image/png;base64,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" alt="Speed" draggable="false">
      <span class="speed-badge" id="l-speed-badge">1</span>
    </button>
    <button class="ibtn" id="l-rocket" title="Rocket Spin">
      <img src="data:image/png;base64,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" alt="Rocket" draggable="false">
    </button>
  </div>

</div><!-- /landscape -->`;
    document.body.appendChild(this._container);

    // ── JS ───────────────────────────────────────────────────────────────────
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
/* ═══════════════════════════════════════════════════════════════
   方向切換：width < height → 直式 / width > height → 橫式

   優先順序：
   1. URL 參數 ?p=1（直式）?p=0（橫式）→ 初始載入時用，無時序問題
   2. postMessage { type:'slotUI:orientation', portrait:true/false }
      → 動態切換方向（demo.html resize / 遊戲引擎觸發）
   3. 獨立視窗自行偵測 innerWidth < innerHeight
═══════════════════════════════════════════════════════════════ */
(function () {
  function setOrientation(portrait) {
    document.body.classList.toggle('is-portrait',  portrait);
    document.body.classList.toggle('is-landscape', !portrait);
  }

  /* 1. URL 參數決定初始方向（iframe 模式由父層帶入，消除 race condition） */
  var urlParams  = new URLSearchParams(window.location.search);
  var paramValue = urlParams.get('p');
  if (paramValue !== null) {
    setOrientation(paramValue === '1');
  }

  /* 2. postMessage 動態切換（覆蓋 URL 參數） */
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'slotUI:orientation') {
      setOrientation(!!e.data.portrait);
    }
  });

  /* 3. 獨立視窗模式：自行監聽 resize */
  if (window.self === window.top) {
    function autoDetect() {
      setOrientation(window.innerWidth < window.innerHeight);
    }
    if (paramValue === null) { autoDetect(); }   /* 無 URL 參數才自動偵測 */
    window.addEventListener('resize', autoDetect);
    window.addEventListener('orientationchange', function () {
      setTimeout(autoDetect, 50);
    });
  }
})();

/**
 * SlotControl UI
 * ─────────────────────────────────────────────────────────────────
 * 發出事件 → window:  slotControl:<action>
 * 接收事件 ← window:  slotControl:set<Prop>
 *
 * 相容 Cocos Creator（WebView / DOM overlay）& PixiJS（DOM layer）
 * ─────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── State ─────────────────────────────────────────────────── */
  var state = {
    balance:    0,
    totalBet:   0,
    totalWin:   0,
    betStep:    0,
    minBet:     0,
    maxBet:     0,
    speedMode:  0,          // 0=normal  1=fast  2=turbo
    isSpinning: false,
    layout:     ''          // 'portrait' | 'landscape'
  };

  /* Speed mode metadata */
  var SPEED_LABELS      = ['normal', 'fast',    'turbo'  ];
  var SPEED_BADGE_TEXT  = ['1',      '2',       '3'      ];
  var SPEED_BADGE_COLOR = ['#999',   '#f7d12e', '#ff4b4b'];
  var SPEED_FILTER      = ['brightness(1)',
                           'brightness(1.25)',
                           'brightness(1.5) saturate(1.6)'];

  /* ── Helpers ───────────────────────────────────────────────── */
  function fmt(n) {
    return '$ ' + n.toFixed(1).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',');
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent('slotControl:' + name, { detail: detail || {} }));
  }

  /* ── Render ────────────────────────────────────────────────── */
  function renderInfo() {
    document.getElementById('p-balance').textContent = fmt(state.balance);
    document.getElementById('p-bet').textContent     = fmt(state.totalBet);
    document.getElementById('p-win').textContent     = fmt(state.totalWin);
    document.getElementById('l-balance').textContent = fmt(state.balance);
    document.getElementById('l-bet').textContent     = fmt(state.totalBet);
    document.getElementById('l-win').textContent     = fmt(state.totalWin);
  }

  function renderSpeed() {
    var badge  = SPEED_BADGE_TEXT[state.speedMode];
    var color  = SPEED_BADGE_COLOR[state.speedMode];
    var filter = SPEED_FILTER[state.speedMode];

    ['p-speed-badge', 'l-speed-badge'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent       = badge;
      el.style.background  = color;
    });

    ['p-speed', 'l-speed'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.filter = filter;
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
      void el.offsetWidth;   // reflow
      el.classList.add('flash');
    });
  }

  /* ── Layout detection ──────────────────────────────────────── */
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

  /* ── Button actions ────────────────────────────────────────── */
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
    // 不做本地 min/max 判斷，讓遊戲的 betIdx 系統決定是否可減
    dispatch('betChange', { totalBet: state.totalBet, direction: 'down' });
    flashBet();
  }

  function onPlus() {
    // 不做本地 min/max 判斷，讓遊戲的 betIdx 系統決定是否可加
    dispatch('betChange', { totalBet: state.totalBet, direction: 'up' });
    flashBet();
  }

  function onSpeed() {
    state.speedMode = (state.speedMode + 1) % 3;
    renderSpeed();
    dispatch('speedChange', { mode: SPEED_LABELS[state.speedMode], modeIndex: state.speedMode });
  }

  /* ── Auto Play panel ──────────────────────────────────────── */
  var autoState = {
    speed:        'normal',
    bet:          0,
    betIdx:       0,
    spins:        10,
    untilFeature: false,
  };
  var SPIN_OPTIONS = [5, 10, 20, 50, 100, 200, 500];

  function openAutoPanel() {
    autoState.bet   = state.totalBet;
    autoState.betIdx = 0;
    // 預設選中當前速度
    autoState.speed = SPEED_LABELS[state.speedMode] || 'normal';
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
    document.querySelectorAll('.ap-speed-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.speed === autoState.speed);
    });
  }

  function initAutoPanel() {
    document.getElementById('ap-close').addEventListener('click', closeAutoPanel);
    document.getElementById('auto-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeAutoPanel();
    });

    // speed
    document.querySelectorAll('.ap-speed-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        autoState.speed = this.dataset.speed;
        renderAutoPanel();
      });
    });

    // bet
    document.getElementById('ap-bet-minus').addEventListener('click', function() {
      var next = Math.max(state.minBet, +(autoState.bet - state.betStep).toFixed(2));
      if (next !== autoState.bet) { autoState.bet = next; renderAutoPanel(); }
    });
    document.getElementById('ap-bet-plus').addEventListener('click', function() {
      var next = Math.min(state.maxBet, +(autoState.bet + state.betStep).toFixed(2));
      if (next !== autoState.bet) { autoState.bet = next; renderAutoPanel(); }
    });

    // spins
    document.getElementById('ap-spin-minus').addEventListener('click', function() {
      var idx = SPIN_OPTIONS.indexOf(autoState.spins);
      if (idx > 0) { autoState.spins = SPIN_OPTIONS[idx - 1]; renderAutoPanel(); }
      else if (idx === 0) { autoState.spins = 999; renderAutoPanel(); }
      // idx === -1 表示目前是 ∞，再按 − 維持 ∞
    });
    document.getElementById('ap-spin-plus').addEventListener('click', function() {
      var idx = SPIN_OPTIONS.indexOf(autoState.spins);
      if (idx < SPIN_OPTIONS.length - 1) { autoState.spins = SPIN_OPTIONS[idx + 1]; renderAutoPanel(); }
      else { autoState.spins = 999; renderAutoPanel(); }
    });

    // until feature
    document.getElementById('ap-feature-toggle').addEventListener('click', function() {
      autoState.untilFeature = !autoState.untilFeature;
      renderAutoPanel();
    });

    // start
    document.getElementById('ap-start').addEventListener('click', function() {
      closeAutoPanel();
      // 把速度同步到主按鈕
      var speedIdx = SPEED_LABELS.indexOf(autoState.speed);
      if (speedIdx < 0) speedIdx = 0;
      if (speedIdx !== state.speedMode) {
        state.speedMode = speedIdx;
        renderSpeed();
        dispatch('speedChange', { mode: autoState.speed, modeIndex: speedIdx });
      }
      dispatch('autoSpinStart', {
        bet:          autoState.bet,
        spins:        autoState.spins >= 999 ? -1 : autoState.spins,
        speed:        autoState.speed,
        modeIndex:    speedIdx,
        untilFeature: autoState.untilFeature,
      });
    });
  }

  /* ── Auto Spin running state ─────────────────────────────────────────────── */
  var autoSpinRunning = false;

  function setAutoSpinning(running, remaining) {
    autoSpinRunning = running;
    var badgeText = running ? (remaining > 0 ? String(remaining) : '∞') : '0';

    // auto button badge
    ['p-auto', 'l-auto'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      if (running) btn.classList.add('auto-spinning');
      else         btn.classList.remove('auto-spinning');
    });
    ['p-auto-badge', 'l-auto-badge'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.textContent = badgeText;
    });

    // lock / unlock spin button
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

  /* ── Hyper Spin panel ─────────────────────────────────────────── */
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
    document.getElementById('hs-bet-val').textContent  = fmt(hsState.bet);
    document.getElementById('hs-spin-val').textContent = String(hsState.spins);
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

    // bet −/+: delegate to game's bet system (same as main bar)
    document.getElementById('hs-bet-minus').addEventListener('click', function() {
      dispatch('betChange', { totalBet: hsState.bet, direction: 'down' });
      // UI will update via slotControl:setTotalBet → sync back to hsState.bet
    });
    document.getElementById('hs-bet-plus').addEventListener('click', function() {
      dispatch('betChange', { totalBet: hsState.bet, direction: 'up' });
    });

    // spins −/+
    document.getElementById('hs-spin-minus').addEventListener('click', function() {
      var idx = HS_SPIN_OPTIONS.indexOf(hsState.spins);
      if (idx > 0) { hsState.spins = HS_SPIN_OPTIONS[idx - 1]; renderHyperSpinPanel(); }
    });
    document.getElementById('hs-spin-plus').addEventListener('click', function() {
      var idx = HS_SPIN_OPTIONS.indexOf(hsState.spins);
      if (idx < HS_SPIN_OPTIONS.length - 1) { hsState.spins = HS_SPIN_OPTIONS[idx + 1]; renderHyperSpinPanel(); }
    });

    // super bet toggle
    document.getElementById('hs-superbet-toggle').addEventListener('click', function() {
      hsState.superBet = !hsState.superBet;
      renderHyperSpinPanel();
    });

    // stop at scatter toggle
    document.getElementById('hs-scatter-toggle').addEventListener('click', function() {
      hsState.stopAtScatter = !hsState.stopAtScatter;
      renderHyperSpinPanel();
    });

    // scatter info button
    document.getElementById('hs-scatter-info').addEventListener('click', function() {
      dispatch('hyperSpinScatterInfo', {});
    });

    // play button
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

  /* ── Settings panel ─────────────────────────────────────────── */
  var settingsState = { spinSpeed: 'normal', sfx: true, music: true };

  function openSettings() {
    renderSettings();
    document.getElementById('settings-overlay').classList.add('open');
  }
  function closeSettings() {
    document.getElementById('settings-overlay').classList.remove('open');
  }
  function renderSettings() {
    document.querySelectorAll('.sp-speed-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.spd === settingsState.spinSpeed);
    });
    var sfxEl = document.getElementById('sp-sfx-toggle');
    var musEl = document.getElementById('sp-music-toggle');
    if (settingsState.sfx)   sfxEl.classList.add('on'); else sfxEl.classList.remove('on');
    if (settingsState.music) musEl.classList.add('on'); else musEl.classList.remove('on');
  }
  function initSettings() {
    document.getElementById('sp-close').addEventListener('click', closeSettings);
    document.getElementById('settings-overlay').addEventListener('click', function(e) {
      if (e.target === this) closeSettings();
    });
    document.querySelectorAll('.sp-speed-btn').forEach(function(btn) {
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
    document.getElementById('sp-favorite').addEventListener('click',   function() { closeSettings(); dispatch('menuFavorite',   {}); });
  }

  function onMenu() { openSettings(); }

  /* ── Wire buttons ──────────────────────────────────────────── */
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

  /* ── External API (game engine → UI) ──────────────────────── */
  window.addEventListener('slotControl:setBalance', function (e) {
    state.balance = +e.detail.balance; renderInfo();
  });
  window.addEventListener('slotControl:setTotalWin', function (e) {
    state.totalWin = +e.detail.totalWin; renderInfo();
  });
  window.addEventListener('slotControl:setTotalBet', function (e) {
    state.totalBet = +e.detail.totalBet;
    hsState.bet    = state.totalBet;   // keep hyper spin bet in sync
    renderInfo(); flashBet();
    // if hyper spin panel is open, refresh its bet display
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

  /* ── Public JS API ─────────────────────────────────────────── */
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

}());
`;
    document.body.appendChild(scriptEl);

    this._applyOrientation();
    console.log('[SlotUI] UI 注入完成（內嵌模式）');
  }

  // ── 事件訂閱 ──────────────────────────────────────────────────────────────

  /**
   * 訂閱 UI 事件，destroy() 時自動移除。
   * @param eventName  使用 SC_EVENT 中的常數
   * @param callback   detail 已解構的回呼
   */
  public on<T = unknown>(eventName: string, callback: (detail: T) => void): void {
    const fn = (e: Event) => callback((e as CustomEvent<T>).detail);
    this._listeners.push([eventName, fn as EventListener]);
    window.addEventListener(eventName, fn as EventListener);
  }

  // ── 遊戲 → UI：數值更新 API ───────────────────────────────────────────────

  public setBalance(amount: number)              { this._dispatch(SC_SET.BALANCE,    { balance: amount }); }
  public setTotalWin(amount: number)             { this._dispatch(SC_SET.TOTAL_WIN,  { totalWin: amount }); }
  public setTotalBet(amount: number)             { this._dispatch(SC_SET.TOTAL_BET,  { totalBet: amount }); }
  public setBetStep(step: number)                { this._dispatch(SC_SET.BET_STEP,   { betStep: step }); }
  public setBetRange(min: number, max: number)   { this._dispatch(SC_SET.BET_RANGE,  { minBet: min, maxBet: max }); }
  public setSpinning(on: boolean)                { this._dispatch(SC_SET.SPINNING,    { spinning: on }); }
  public setSpeedMode(i: 0 | 1 | 2)             { this._dispatch(SC_SET.SPEED_MODE,  { modeIndex: i }); }
  public setAutoSpinning(running: boolean, remaining: number) {
    this._dispatch(SC_SET.AUTO_SPINNING, { running, remaining });
  }

  private _dispatch(name: string, detail: Record<string, unknown>): void {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

/* ═════════════════════════════════════════════════════════════════════════════
   Cocos Creator 3.x 包裝器範例
   ─────────────────────────────────────────────────────────────────────────────
   將以下程式碼複製到你的 Cocos 專案中（例如 assets/scripts/SlotUIComponent.ts）
   並掛載到場景中的 GameManager Node。
   SlotUI.ts 本身不需要放進 Cocos 專案的 assets/，
   只需複製這個包裝器即可。
   ─────────────────────────────────────────────────────────────────────────────

import { _decorator, Component } from 'cc';
import { SlotUI, SC_EVENT, SpinDetail, BetChangeDetail, SpeedDetail } from './SlotUI';
const { ccclass, property } = _decorator;

@ccclass('SlotUIComponent')
export class SlotUIComponent extends Component {

  @property({ type: String, tooltip: 'slot-control.html 路徑（相對於 build 輸出根目錄）' })
  htmlPath: string = './slot-ui/slot-control.html';

  public readonly bridge = new SlotUI();

  onLoad() {
    this.bridge.htmlPath = this.htmlPath;
    this.bridge.init();
  }

  onDestroy() {
    this.bridge.destroy();
  }

  // ── 監聽 UI 事件 ────────────────────────────────────────────────────────

  start() {
    this.bridge.on<SpinDetail>(SC_EVENT.SPIN, ({ bet, speed }) => {
      console.log(`Spin  bet=${bet}  speed=${speed}`);
      // TODO: 呼叫轉輪邏輯
    });

    this.bridge.on(SC_EVENT.SPIN_STOP, () => {
      console.log('Stop spin');
    });

    this.bridge.on<BetChangeDetail>(SC_EVENT.BET_CHANGE, ({ totalBet }) => {
      console.log('Bet:', totalBet);
    });

    this.bridge.on<SpeedDetail>(SC_EVENT.SPEED_CHANGE, ({ modeIndex }) => {
      // 0=normal  1=fast  2=turbo
    });
  }

  // ── 委派常用方法（讓其他 Script 直接呼叫此 Component）────────────────────

  setBalance(v: number)   { this.bridge.setBalance(v);   }
  setTotalWin(v: number)  { this.bridge.setTotalWin(v);  }
  setTotalBet(v: number)  { this.bridge.setTotalBet(v);  }
  setSpinning(v: boolean) { this.bridge.setSpinning(v);  }
  setBetRange(min: number, max: number) { this.bridge.setBetRange(min, max); }
}

═════════════════════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════════════════════
   PixiJS 使用範例
   ─────────────────────────────────────────────────────────────────────────────

import * as PIXI from 'pixi.js';
import { SlotUI, SC_EVENT, SpinDetail } from './SlotUI';

const app = new PIXI.Application({ ... });

const bridge = new SlotUI();
bridge.htmlPath = './slot-ui/slot-control.html';
bridge.init();

// 監聽事件
bridge.on<SpinDetail>(SC_EVENT.SPIN, ({ bet, speed }) => {
  console.log('Spin!', bet, speed);
  startReelSpin(bet);
});

bridge.on(SC_EVENT.SPIN_STOP, () => stopReelSpin());

// 更新數值
bridge.setBalance(100000);
bridge.setTotalBet(10);
bridge.setBetRange(1, 5000);
bridge.setBetStep(5);

// 場景切換時清理
bridge.destroy();

═════════════════════════════════════════════════════════════════════════════ */
