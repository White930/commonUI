# Slot Control UI — 使用說明

共用 Slot 遊戲控制介面，支援直式 720×1280 / 橫式 1280×720 自動切換，
相容 Cocos Creator 3.x（Web 平台）與 PixiJS。

---

## 📁 檔案結構

```
commonUI/
├── slot-control.html       # 核心 UI（HTML/CSS/JS，圖片已內嵌 base64）
├── SlotUI.ts               # 框架無關橋接器（自動由 generate_slotui.js 產生）
├── SlotUIComponent.ts      # Cocos Creator 3.x 包裝器（掛到場景 Node 上）
├── generate_slotui.js      # 將 slot-control.html 內嵌進 SlotUI.ts 的工具腳本
├── demo.html               # 完整展示頁
├── build_inline.js         # 建置工具
└── images/                 # UI 圖示（PNG，已內嵌進 slot-control.html）
```

> **修改流程**：編輯 `slot-control.html` 後，執行 `node generate_slotui.js`
> 重新產生 `SlotUI.ts`，再同步到遊戲專案。

---

## 🎮 Cocos Creator 整合步驟

### 1. 複製檔案到遊戲專案

```
assets/scripts/
├── SlotUI.ts               ← 複製自 commonUI
└── SlotUIComponent.ts      ← 複製自 commonUI
```

### 2. 修改 SlotController.ts（遊戲端一次性設定）

在遊戲的 `SlotController.ts` 三個 setter 加入 `EventBus.emit`，
讓 UI 能即時收到數值更新：

```typescript
public setBalance(balance: number) {
    // ... 原有程式碼 ...
    SlotController.EventBus.emit('balanceChanged', balance);   // ← 新增
}

public setTotalWin(totalWin: number) {
    // ... 原有程式碼 ...
    SlotController.EventBus.emit('totalWinChanged', totalWin); // ← 新增
}

private setTotalBet(totalBet: number) {
    // ... 原有程式碼 ...
    SlotController.EventBus.emit('totalBetChanged', totalBet); // ← 新增
}
```

### 3. 掛載元件

在場景中選擇常駐的 Node（例如 `GameManager`），
在 Inspector 中點 **Add Component → SlotUIComponent**。

---

## 📡 事件系統

### UI → 遊戲（監聽玩家操作）

`SlotUIComponent.ts` 已自動處理所有標準事件，無需額外設定。
若需在其他腳本監聽，使用 `bridge.on()`：

```typescript
import { SlotUI, SC_EVENT, SpinDetail, BetChangeDetail, SpeedDetail,
         HyperSpinDetail, LayoutDetail } from './SlotUI';
```

| 常數 | 觸發時機 | Payload 型別 |
|------|----------|--------------|
| `SC_EVENT.SPIN` | 按下 SPIN（開始旋轉） | `SpinDetail` `{ bet, speed }` |
| `SC_EVENT.SPIN_STOP` | 旋轉中再按 SPIN（停止） | — |
| `SC_EVENT.BET_CHANGE` | 按 − / + 改變投注 | `BetChangeDetail` `{ totalBet, direction }` |
| `SC_EVENT.SPEED_CHANGE` | 速度模式改變 | `SpeedDetail` `{ mode, modeIndex }` |
| `SC_EVENT.HYPER_SPIN` | Hyper Spin 面板按下 PLAY | `HyperSpinDetail` `{ bet, spins }` |
| `SC_EVENT.AUTO_SPIN_START` | Auto Play 按下 START | `{ spins, untilFeature, modeIndex }` |
| `SC_EVENT.AUTO_SPIN_STOP` | Auto Play 停止（手動或條件觸發） | — |
| `SC_EVENT.SETTINGS_SPEED_CHANGE` | Settings 速度選項改變 | `{ mode, modeIndex }` |
| `SC_EVENT.SETTINGS_SFX_CHANGE` | Settings 音效開關 | `{ on: boolean }` |
| `SC_EVENT.SETTINGS_MUSIC_CHANGE` | Settings 音樂開關 | `{ on: boolean }` |
| `SC_EVENT.MENU_HISTORY` | Settings → History 按鈕 | — |
| `SC_EVENT.MENU_FULLSCREEN` | Settings → Full Screen 按鈕 | — |
| `SC_EVENT.MENU_HOW_TO_PLAY` | Settings → How to Play 按鈕 | — |
| `SC_EVENT.MENU_FAVORITE` | Settings → Favorite 按鈕 | — |
| `SC_EVENT.LAYOUT_CHANGE` | 螢幕方向切換 | `LayoutDetail` `{ layout, width, height }` |

### 遊戲 → UI（更新顯示數值）

`SlotUIComponent` 透過 `SlotController.EventBus` 自動同步 balance / totalWin / totalBet。
若需手動呼叫（初始化或特殊情況）：

```typescript
const comp = find('GameManager')!.getComponent(SlotUIComponent)!;

comp.setBalance(128890800);      // 餘額
comp.setTotalWin(5000);          // 本局總贏分
comp.setTotalBet(1000);          // 目前投注
comp.setBetRange(100, 50000);    // 投注範圍
comp.setSpeedMode(0);            // 速度：0=normal 1=fast 2=turbo
comp.setSpinning(true);          // 旋轉中狀態（true 時 SPIN 按鈕鎖定）
comp.stopAutoSpin();             // 強制停止 Auto Play
```

---

## 🪟 彈出面板

| 按鈕 | 面板 | 主要功能 |
|------|------|----------|
| ≡ 選單 | **Settings** | 速度選擇、音效/音樂開關、History / Full Screen / How to Play / Favorite |
| 🚀 火箭 | **Hyper Spin** | 選擇投注、局數（5–50）、Super Bet、Berhenti di Scatter、顯示餘額 |
| ↺ Auto | **Auto Play** | 選擇速度、局數（5/10/20/50/100/200/500/∞）、Until Feature 選項 |

### Auto Play 細節

- 局數選擇器：5 → 10 → 20 → 50 → 100 → 200 → 500 → **∞**，頭尾循環
- 執行中：SPIN 按鈕鎖定（不可手動操作）；Auto 按鈕顯示剩餘次數 badge
- Until Feature：偵測到 Free Game 觸發時自動停止
- 速度選項即時連動遊戲速度模式

---

## 🔒 Spin 按鈕鎖定邏輯

| 狀態 | 鎖定方式 |
|------|----------|
| 旋轉中（`setSpinning(true)`） | `.spinning` → `pointer-events: none`，亮度 50% |
| Auto Play 執行中 | `.auto-locked` → `pointer-events: none`，灰色 |

---

## 🖥️ 全螢幕支援

點擊 Settings → Full Screen 後，UI 容器會自動移入 `fullscreenElement` 內部，
退出全螢幕時移回 `document.body`，確保全螢幕模式下 UI 仍然可見。

---

## 📐 方向切換規則

| 條件 | 版面 |
|------|------|
| `window.innerWidth < window.innerHeight` | **直式** 720×1280 |
| `window.innerWidth > window.innerHeight` | **橫式** 1280×720 |

切換時自動在 `document.body` 加上 `is-portrait` / `is-landscape` class，
**不依賴 CSS `@media (orientation)`**，在 WebView 與 PixiJS 環境均可正常偵測。

---

## 🔧 PixiJS 整合

`SlotUI.ts` 無任何 Cocos 依賴，PixiJS 可直接使用 `SlotUI` 橋接器：

```typescript
import { SlotUI, SC_EVENT, SpinDetail } from './SlotUI';

const bridge = new SlotUI();
bridge.init();

bridge.on<SpinDetail>(SC_EVENT.SPIN, ({ bet, speed }) => {
    startSpin(bet);
});

bridge.setBalance(100000);

// 場景切換時清理
bridge.destroy();
```

---

## 🔄 修改與發布流程

```bash
# 1. 修改 UI 邏輯
#    編輯 slot-control.html

# 2. 重新產生 SlotUI.ts（內嵌 HTML）
node generate_slotui.js

# 3. 同步到遊戲專案
cp SlotUI.ts          ../your-game/assets/scripts/
cp SlotUIComponent.ts ../your-game/assets/scripts/
```

---

## ⚠️ 注意事項

- **僅支援 Web 平台**：Native build 需改用 Cocos 的 `WebView` 元件
- **不要直接編輯 `SlotUI.ts`**：它由 `generate_slotui.js` 自動產生，修改會被覆蓋
- **EventBus 必須設定**：若未在 `SlotController.ts` 加入 `EventBus.emit`，balance / totalWin / totalBet 不會即時更新
- **z-index**：UI 容器預設 `z-index: 9999`，如有衝突請修改 `slot-control.html` 的 `#slot-ctrl-root` 樣式
- **多個實例**：請勿在同一頁面重複掛載，會導致事件重複觸發
