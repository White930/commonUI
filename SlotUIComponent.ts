/**
 * SlotUIComponent.ts  ──  Cocos Creator 3.x 包裝器
 * ─────────────────────────────────────────────────────────────────────────────
 * 掛載到場景中的常駐 Node（如 GameManager）
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { _decorator, Component, director, js } from 'cc';
import { SlotUI, SC_EVENT, SpinDetail, BetChangeDetail, SpeedDetail } from './SlotUI';

const { ccclass } = _decorator;

@ccclass('SlotUIComponent')
export class SlotUIComponent extends Component {

  public readonly bridge = new SlotUI();

  private _ctrl:     any = null;
  private _machine:  any = null;
  private _eventBus: any = null;
  private _bound    = false;

  // 上次已推送給 UI 的值（避免無意義更新）
  private _lastBal = NaN;
  private _lastBet = NaN;
  private _lastWin = NaN;

  // ── 生命週期 ──────────────────────────────────────────────────────────────

  onLoad() {
    this.bridge.init();
    this._bindUIEvents();
  }

  start() {
    this._tryInit();
  }

  onDestroy() {
    // patch 是直接覆寫實例方法，元件銷毀時無需額外清理
    // 清除 Machine.Event 監聽
    this._machine?.Event?.targetOff(this);
    this.bridge.destroy();
  }

  // ── 初始化（含重試）────────────────────────────────────────────────────────

  private _tryInit(attempt = 0) {
    this._resolveRefs();
    if (this._ctrl) {
      if (!this._bound) {
        this._bound = true;
        this._bindGameEvents();
      }
      return;
    }
    if (attempt < 10) {
      this.scheduleOnce(() => this._tryInit(attempt + 1), 0.5);
    } else {
      console.warn('[SlotUIComponent] SlotController not found after 5s');
    }
  }

  // ── 取得遊戲核心引用 ──────────────────────────────────────────────────────

  private _resolveRefs() {
    const gr = (window as any).__gameRefs;
    if (gr?.ctrl) {
      this._ctrl    = gr.ctrl;
      this._machine = gr.machine;
      this._resolveAutoSpin();
      return;
    }

    const scene = director.getScene();

    // 1. 找 Machine
    if (!this._machine) {
      this._machine = scene?.getComponentsInChildren('Machine')?.[0] ?? null;
    }

    // 2. 優先透過 Machine.controller 取得正確 ctrl（與 props['ui'] 同一物件）
    if (!this._ctrl && this._machine) {
      const mc = (this._machine as any).controller;
      if (mc && typeof mc.clickSpin === 'function') {
        this._ctrl = mc;
        console.log('[SlotUIComponent] ctrl via machine.controller ✓');
      }
    }

    // 3. fallback：duck-type 掃描
    if (!this._ctrl) {
      const all = scene?.getComponentsInChildren(Component) ?? [];
      for (const c of all) {
        const ac = c as any;
        if (typeof ac.clickSpin === 'function' && typeof ac.changeSpeedMode === 'function') {
          this._ctrl = ac;
          console.log('[SlotUIComponent] ctrl via duck-type ✓');
          break;
        }
      }
    }

    // 4. EventBus：掃描場景，找 constructor 上有 EventBus 的元件
    if (!this._eventBus) {
      const all = scene?.getComponentsInChildren(Component) ?? [];
      for (const c of all) {
        const bus = (c as any).constructor?.['EventBus'];
        if (bus) { this._eventBus = bus; console.log('[SlotUIComponent] EventBus found ✓'); break; }
      }
    }

    this._resolveAutoSpin();
    console.log('[SlotUIComponent] _resolveRefs — ctrl:', !!this._ctrl, 'machine:', !!this._machine,
                'eventBus:', !!this._eventBus, 'autoSpin:', !!this._autoSpin);
  }


  // ── UI → 遊戲 ────────────────────────────────────────────────────────────

  private _bindUIEvents() {
    this.bridge.on<SpinDetail>(SC_EVENT.SPIN, () => {
      this._ctrl?.clickSpin();
    });

    this.bridge.on(SC_EVENT.SPIN_STOP, () => {
      this._ctrl?.clickSpin();
    });

    this.bridge.on<BetChangeDetail>(SC_EVENT.BET_CHANGE, ({ direction }) => {
      if (!this._ctrl) return;
      if (direction === 'up')   this._ctrl.clickTotalBetIncrease?.();
      if (direction === 'down') this._ctrl.clickTotalBetDecrease?.();
      // betIdx 已同步更新，getter 直接回傳最終值
      const bet = this._ctrl.totalBet;
      if (typeof bet === 'number' && !isNaN(bet)) {
        this._lastBet = bet;
        this.bridge.setTotalBet(bet);
      }
    });

    this.bridge.on<SpeedDetail>(SC_EVENT.SPEED_CHANGE, ({ modeIndex }) => {
      this._ctrl?.changeSpeedMode?.(this._toGameMode(modeIndex));
    });

    this.bridge.on(SC_EVENT.AUTO_SPIN_START, (cfg: any) => {
      this._startAutoSpin(cfg);
    });

    this.bridge.on(SC_EVENT.AUTO_SPIN_STOP, () => {
      this._stopAutoSpin();
    });

    this.bridge.on(SC_EVENT.MENU_HISTORY, () => {
      this._ctrl?.clickRecord?.();
    });

    this.bridge.on(SC_EVENT.MENU_FULLSCREEN, () => {
      this._ctrl?.clickFullscreen?.();
    });

    this.bridge.on(SC_EVENT.MENU_HOW_TO_PLAY, () => {
      this._ctrl?.clickInformation?.();
    });

    this.bridge.on(SC_EVENT.MENU_FAVORITE, () => {
      this._toggleFavorite();
    });
  }

  /** 將目前遊戲加入 / 移除最愛
   *  優先透過 __GAME_PLUGIN__ dispatch；備援為 duck-type 找 UIInGameMenuPanel */
  private _toggleFavorite() {
    const plugin = (window as any).__GAME_PLUGIN__;
    if (plugin?.dispatch) {
      plugin.dispatch({ type: 'setting/setGameListDialogShow', payload: true });
      return;
    }
    // fallback：掃場景找到具有 onButtonInGameMenuClick 的組件
    const scene = director.getScene();
    const all   = scene?.getComponentsInChildren(Component) ?? [];
    for (const c of all) {
      const ac = c as any;
      if (typeof ac.onButtonInGameMenuClick === 'function') {
        ac.onButtonInGameMenuClick();
        return;
      }
    }
    console.warn('[SlotUIComponent] Favorite: __GAME_PLUGIN__ not found');
  }

  // ── 遊戲 → UI ────────────────────────────────────────────────────────────

  private _bindGameEvents() {
    // monkey-patch：直接在 _ctrl 實例上攔截，不依賴 static EventBus
    // _ctrl = machine.controller = Controller.Instance（SlotController 實例）
    const ctrl = this._ctrl;
    if (ctrl) {
      if (typeof ctrl.setBalance === 'function' && !ctrl.__slotUIPatchedBalance) {
        const orig = ctrl.setBalance.bind(ctrl);
        ctrl.setBalance = (v: number) => {
          orig(v);
          if (v !== this._lastBal) { this._lastBal = v; this.bridge.setBalance(v); }
        };
        ctrl.__slotUIPatchedBalance = true;
      }
      if (typeof ctrl.setTotalWin === 'function' && !ctrl.__slotUIPatchedWin) {
        const orig = ctrl.setTotalWin.bind(ctrl);
        ctrl.setTotalWin = (v: number) => {
          orig(v);
          if (v !== this._lastWin) { this._lastWin = v; this.bridge.setTotalWin(v); }
        };
        ctrl.__slotUIPatchedWin = true;
      }
      if (typeof ctrl.setTotalBet === 'function' && !ctrl.__slotUIPatchedBet) {
        const orig = ctrl.setTotalBet.bind(ctrl);
        ctrl.setTotalBet = (v: number) => {
          orig(v);
          if (v !== this._lastBet) { this._lastBet = v; this.bridge.setTotalBet(v); }
        };
        ctrl.__slotUIPatchedBet = true;
      }
    } else {
      console.warn('[SlotUIComponent] ctrl not found, cannot patch setters');
    }

    // 初始值推送：直接讀源頭，不走 lastValue（enterGame 不 await tween，lastValue 尚未更新）
    const pushInitValues = () => {
      const bal = (this._machine as any)?.userCredit       // Machine.userCredit = DataManager.instance.userData.credit
               ?? this._ctrl?.props?.['dataMgr']?.userData?.credit;
      const bet = this._ctrl?.totalBet;
      if (typeof bal === 'number' && !isNaN(bal) && bal !== 0) { this._lastBal = bal; this.bridge.setBalance(bal); }
      if (typeof bet === 'number' && !isNaN(bet) && bet !== 0) { this._lastBet = bet; this.bridge.setTotalBet(bet); }
    };
    pushInitValues();
    this._machine?.Event?.on('enter_game', pushInitValues, this);

    // spinning 狀態輪詢（0.1s）
    this.schedule(this._syncSpinState, 0.1);

    // auto spin 剩餘次數輪詢（0.2s）
    this.schedule(this._asPoll, 0.2);

    // 速度模式（初始）
    this.bridge.setSpeedMode(this._toSlotUIMode(this._machine?.SpeedMode ?? 0));
  }

  // ── 輪詢同步 spin 狀態 ────────────────────────────────────────────────────

  private _lastSpinning = false;

  private _syncSpinState = () => {
    const spinning = this._machine?.spinning ?? false;
    if (spinning !== this._lastSpinning) {
      this._lastSpinning = spinning;
      this.bridge.setSpinning(spinning);
    }
  };

  // ── Auto Spin（委派給遊戲的 AutoSpin 組件）──────────────────────────────

  private _autoSpin: any = null;   // AutoSpin component（duck-typed）

  /** 在場景中找 AutoSpin 組件（有 decrementCount + stopAutoSpin + properties.autoSpin） */
  private _resolveAutoSpin() {
    if (this._autoSpin) return;
    const scene = director.getScene();
    const all   = scene?.getComponentsInChildren(Component) ?? [];
    for (const c of all) {
      const ac = c as any;
      if (typeof ac.decrementCount === 'function' &&
          typeof ac.stopAutoSpin   === 'function' &&
          ac['properties']?.['autoSpin'] !== undefined) {
        this._autoSpin = ac;
        console.log('[SlotUIComponent] AutoSpin resolved ✓');
        break;
      }
    }
  }

  /**
   * 直接設定 AutoSpin 的 properties 再呼叫 decrementCount()，
   * 讓遊戲自己的 loop（clickSpin → await machine.clickSpin → decrementCount）跑。
   */
  private _startAutoSpin(cfg: { spins: number; untilFeature?: boolean; modeIndex?: number }) {
    this._resolveAutoSpin();
    if (!this._autoSpin) { console.warn('[SlotUIComponent] AutoSpin not found'); return; }
    if (this._machine?.isBusy)  return;

    // 套用速度模式
    if (typeof cfg.modeIndex === 'number') {
      this._ctrl?.changeSpeedMode?.(this._toGameMode(cfg.modeIndex));
    }

    const props = this._autoSpin['properties']['autoSpin'] as any;
    const spins  = cfg.spins ?? 10;
    props.active         = true;
    props.spinTimeActive = spins > 0;
    props.spinTimes      = spins > 0 ? spins : -1;
    props.untilFeature   = !!cfg.untilFeature;

    this.bridge.setAutoSpinning(true, spins > 0 ? spins : -1);
    this._autoSpin.decrementCount();
  }

  private _stopAutoSpin() {
    this._autoSpin?.stopAutoSpin(true);
    this.bridge.setAutoSpinning(false, 0);
  }

  private _prevFeatureGame = false;

  /** 每 0.2s 把遊戲的 auto spin 剩餘次數同步到 UI badge，
   *  並在 untilFeature 模式偵測到 featureGame 開始時停止 auto spin */
  private _asPoll = () => {
    if (!this._autoSpin) return;

    // ── untilFeature：featureGame false→true 時停止 auto spin ──
    const featureGame = !!(this._machine?.featureGame);
    if (featureGame && !this._prevFeatureGame) {
      // featureGame 剛開始：若 untilFeature 開啟則呼叫官方 stop 方法
      this._autoSpin.stopSpinByUtilFeature?.();
    }
    this._prevFeatureGame = featureGame;

    // ── 同步 badge ──
    const props     = this._autoSpin['properties']['autoSpin'] as any;
    const running   = !!props.active;
    const remaining = props.spinTimes ?? 0;
    this.bridge.setAutoSpinning(running, running ? remaining : 0);
  };

  // ── 速度模式轉換 ──────────────────────────────────────────────────────────

  private _toGameMode(modeIndex: number): number {
    return ({ 0: 0, 1: 1, 2: 2 } as Record<number, number>)[modeIndex] ?? 0;
  }

  private _toSlotUIMode(gameMode: number): 0 | 1 | 2 {
    if (gameMode >= 2) return 2;
    return gameMode as 0 | 1 | 2;
  }

  // ── 公開 API ──────────────────────────────────────────────────────────────

  setBalance(v: number)                { this.bridge.setBalance(v);         }
  setTotalWin(v: number)               { this.bridge.setTotalWin(v);        }
  setTotalBet(v: number)               { this.bridge.setTotalBet(v);        }
  setSpinning(v: boolean)              { this.bridge.setSpinning(v);        }
  setBetRange(min: number, max: number){ this.bridge.setBetRange(min, max); }
  setSpeedMode(i: 0|1|2)              { this.bridge.setSpeedMode(i);       }
  stopAutoSpin()                       { this._stopAutoSpin();              }
}
