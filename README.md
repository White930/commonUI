# Slot Control UI — 使用說明

共用 Slot 遊戲控制介面，支援直式 720×1280 / 橫式 1280×720 自動切換，
相容 Cocos Creator 3.x（Web 平台）與 PixiJS。

---

## 📁 檔案結構

```
commonUI/
├── slot-control-base.html   # 核心 UI 基底（不含內嵌資源）
├── slot-control.css         # 核心 UI 樣式
├── slot-control.js          # 核心 UI 邏輯
├── slot-control-init.js     # 核心 UI 初始化
│
├── panel-settings.html      # Settings 彈出面板（HTML 片段）
├── panel-settings.css       # Settings 面板樣式
├── panel-settings.js        # Settings 面板邏輯
│
├── panel-auto.html          # Auto Play 彈出面板（HTML 片段）
├── panel-auto.css           # Auto Play 面板樣式
├── panel-auto.js            # Auto Play 面板邏輯
│
├── panel-hyperspin.html     # Hyper Spin 彈出面板（HTML 片段）
├── panel-hyperspin.css      # Hyper Spin 面板樣式
├── panel-hyperspin.js       # Hyper Spin 面板邏輯
│
├── panel-test.html          # 面板獨立測試頁（fetch 動態載入三個面板）
├── demo.html                # 完整 UI 本地展示頁
│
├── dist/
│   └── slot-control.html    # ⬅ build.js 產生的單一可部署檔（勿直接編輯）
│
├── SlotUI.ts                # 框架無關橋接器（由 generate_slotui.js 產生）
├── SlotUIComponent.ts       # Cocos Creator 3.x 場景元件
├── SlotUIConnector.js       # PixiJS 用橋接器範本
│
├── slot-ui-loader.js        # Cocos template 用載入器（fetch 注入 UI）
│
├── build.js                 # 組合工具：合併所有 CSS/JS/HTML → dist/slot-control.html
├── build_inline.js          # build 變體（圖片以 base64 內嵌）
├── generate_slotui.js       # 產生內嵌版 SlotUI.ts（含 base64 圖片）
├── generate-connector.js    # AI 工具：用 Claude 自動生成 SlotUIConnector.ts
├── deploy-cocos.js          # 部署腳本：Cocos Creator 3.x 專案
├── deploy-pixi.js           # 部署腳本：PixiJS / 純 HTML 專案
└── images/                  # UI 圖示（PNG）
```

> **修改流程**：編輯原始碼後，執行 `node build.js` 重新產生 `dist/slot-control.html`，
> 再視需求執行對應的 deploy 腳本。

### 彈出面板

三個面板（Settings / Auto Play / Hyper Spin）各自獨立為 HTML 片段 + CSS + JS，
由 `panel-test.html` 透過 `fetch()` 動態載入，方便獨立開發與測試：

```
panel-test.html
  ├─ fetch → panel-settings.html  +  panel-settings.css  +  panel-settings.js
  ├─ fetch → panel-auto.html      +  panel-auto.css      +  panel-auto.js
  └─ fetch → panel-hyperspin.html +  panel-hyperspin.css +  panel-hyperspin.js
```

> **注意**：`fetch()` 需要 HTTP server，請用 `npx serve .` 或 VS Code Live Server 開啟，不支援 `file://` 直接開啟。

---

## 🛠️ 工具腳本說明

### `build.js` — 組合 UI 來源檔

```bash
node build.js
```

將所有模組化的原始檔合併，產生 `dist/slot-control.html`（單一可部署檔）。

| 輸入 | 說明 |
|------|------|
| `slot-control-base.html` | HTML 骨架，含 `<!-- @include:panel-*.html -->` 佔位符 |
| `slot-control.css` + `panel-*.css` | 所有 CSS 合併後內嵌為 `<style>` |
| `slot-control.js` + `panel-*.js` + `slot-control-init.js` | 所有 JS 合併後內嵌為 `<script>` |

輸出：`dist/slot-control.html`（含完整 CSS / JS，圖片路徑保留為 `images/`）

---

### `generate_slotui.js` — 產生內嵌版 `SlotUI.ts`

```bash
node generate_slotui.js
```

從 `dist/slot-control.html` 讀取內容，將所有 `images/` 圖片轉為 base64 後，
更新 `SlotUI.ts` 的 `_injectUI()` 方法，使 TypeScript 橋接器可以獨立運作，無需外部圖片檔案。

> **注意**：`SlotUI.ts` 由此腳本自動產生，請勿直接編輯 `_injectUI` 方法內容，否則下次執行會被覆蓋。

---

### `deploy-cocos.js` — 部署到 Cocos Creator 3.x 專案

```bash
node deploy-cocos.js <client>

# 範例
node deploy-cocos.js client-55
node deploy-cocos.js client-59
```

#### 執行步驟

1. **Build**：自動呼叫 `build.js` 產生 `dist/slot-control.html`
2. **複製到 template 目錄**：將 UI 檔案部署到 Cocos 的兩個模板位置
3. **注入 loader tag**：在兩個 `index.ejs` 的 `</body>` 前插入 `<script src="slot-ui/loader.js"></script>`（冪等，已存在則略過）
4. **同步 build 輸出**：若 `build/web-mobile/` 已存在，一併更新（不必重新 Build 即可即時測試）

#### Cocos Template 目錄說明

Cocos Creator 3.x 有兩種自訂模板機制，各對應不同時機：

| 目錄 | 時機 | 說明 |
|------|------|------|
| `<client>/preview-template/` | **編輯器內預覽**（點 Play 按鈕） | 覆蓋 Cocos 內建預覽頁；`index.ejs` 是預覽的 HTML 模板 |
| `<client>/build-templates/web-mobile/` | **正式 Build**（Build → web-mobile） | Cocos 會將此目錄內容合併到每次 build 輸出；`index.ejs` 是最終 HTML 模板 |

#### 部署後的目錄結構

```
<client>/
├── preview-template/
│   ├── index.ejs                   ← 已注入 <script src="slot-ui/loader.js">
│   └── slot-ui/
│       ├── slot-control.html       ← UI 主體（fetch 注入用）
│       ├── loader.js               ← 頁面載入後自動注入 UI
│       ├── connector.js            ← 遊戲橋接器（手動放置，deploy 不覆蓋）
│       └── images/                 ← UI 圖示
│
├── build-templates/
│   └── web-mobile/
│       ├── index.ejs               ← 已注入 <script src="slot-ui/loader.js">
│       └── slot-ui/                ← 結構同上
│
└── build/
    └── web-mobile/                 ← Cocos build 輸出（若已存在則同步更新）
        └── slot-ui/
```

> **connector.js 保護**：若 `slot-ui/connector.js` 已存在，`deploy-cocos.js` 不會覆蓋它，確保遊戲端的橋接邏輯不被意外清除。

#### 首次設定（template 目錄不存在時）

1. 在 Cocos Editor 對目標專案執行一次 **Build → web-mobile**，讓 Cocos 自動生成 `build-templates/` 預設內容
2. 對 `preview-template/` 手動建立 `index.ejs`，或從 Cocos 安裝目錄複製預設模板
3. 執行 `node deploy-cocos.js <client>` 注入 loader tag

最簡 `index.ejs` 範本：

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title><%= title %></title></head>
<body>
    <%- cocosScript %>
    <script src="slot-ui/loader.js"></script>
</body>
</html>
```

---

### `slot-ui-loader.js` — Template 載入器

部署到 `slot-ui/loader.js`，由 `index.ejs` 引入，負責在頁面就緒後自動注入 UI：

1. 偵測自身 `<script src>` 路徑，計算 `BASE_PATH`（如 `slot-ui/`）
2. 以 `fetch()` 載入 `slot-control.html`
3. 將所有 `src="images/`、`'images/` 路徑改寫為絕對路徑（確保圖片正確顯示）
4. 注入 `<style>` 到 `document.head`，注入 DOM 到 `document.body`
5. 動態執行 UI 內嵌的 `<script>` 區塊
6. 嘗試載入同目錄的 `connector.js`（不存在時靜默忽略）

---

### `deploy-pixi.js` — 部署到 PixiJS / 純 HTML 專案

```bash
node deploy-pixi.js <client> <game> <dev|prod>

# 開發環境
node deploy-pixi.js client-21 21fruit dev

# Production
node deploy-pixi.js client-21 21fruit prod
```

| 參數 | 說明 |
|------|------|
| `<client>` | 客戶目錄名稱（`~/Documents/<client>/`） |
| `<game>` | 遊戲子目錄名稱（`~/Documents/<client>/<game>/`） |
| `dev` | 部署到開發目錄 `~/Documents/<client>/<game>/` |
| `prod` | 部署到 Production 輸出 `~/Documents/Production/upload/<game>/` |

#### dev 模式複製項目

| 來源 | 目的地 |
|------|--------|
| `dist/slot-control.html`（圖片路徑已改寫為 `slot-ui/`） | `<game>/slot-control.html` |
| `images/*` | `<game>/slot-ui/` |
| `SlotUIConnector.js` | `<game>/js/`（若 `js/` 目錄存在，供 pack2.sh 編譯用） |

#### prod 模式複製項目

| 來源 | 目的地 |
|------|--------|
| `dist/slot-control.html`（同上） | `Production/upload/<game>/slot-control.html` |
| `images/*` | `Production/upload/<game>/slot-ui/` |

---

### `generate-connector.js` — AI 自動生成 `SlotUIConnector.ts`

```bash
# 需要設定 Anthropic API Key
export ANTHROPIC_API_KEY=sk-ant-...
# 或在 commonUI/.env 建立：ANTHROPIC_API_KEY=sk-ant-...

node generate-connector.js <client>

# 範例
node generate-connector.js client-59
```

自動掃描目標 Cocos 專案的關鍵原始碼（`Machine.ts`、`Controller.ts`、`AutoSpin.ts` 等），
呼叫 Claude API 分析架構後，生成適合該專案的 `SlotUIConnector.ts`，
輸出至 `<client>/assets/scripts/game/machine/SlotUIConnector.ts`。

> **前提**：需要有 `client-55` 的 `SlotUIConnector5500.ts` 作為 AI 的參考實作。
> 若某些 API 在掃描到的原始碼中找不到，AI 會在對應位置加上 `TODO` 注釋。

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
| ≡ 選單 | **Settings** | 速度選擇（Normal / Fast / Turbo）、音效/音樂開關、History / Full Screen / How to Play / Favorite |
| 🚀 火箭 | **Hyper Spin** | 選擇投注、局數（5–50）、Super Bet、Berhenti di Scatter、顯示餘額 |
| ↺ Auto | **Auto Play** | 選擇速度（Normal / Fast / Turbo）、投注、局數（5/10/20/50/100/200/500/∞）、Until Feature |

### 速度選擇器（Spin Animation）

Settings 與 Auto Play 面板均內建速度選擇器，使用圖片疊加方式實作：

- `UI_SPEED_SELECTOR.png`：輪廓背景（395×73）
- `UI_SPEED_SELECTOR_NORMAL/FAST/TURBO.png`：各選項的高亮藥丸圖片（~136×53）
- 藥丸圖片以 `height: 85%; width: auto` 縮放，保持原始比例置中於各 zone

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
#    編輯 slot-control.html / panel-*.html / *.css / *.js

# 2. 組合為單一部署檔
node build.js

# 3a. 部署到 Cocos 專案
node deploy-cocos.js client-55

# 3b. 部署到 PixiJS 專案（開發）
node deploy-pixi.js client-21 21fruit dev

# 3c. 部署到 PixiJS 專案（Production）
node deploy-pixi.js client-21 21fruit prod

# 4. 若需更新 SlotUI.ts（Cocos TypeScript 內嵌模式）
node generate_slotui.js
cp SlotUI.ts          ../your-game/assets/scripts/
cp SlotUIComponent.ts ../your-game/assets/scripts/
```

---

## ⚠️ 注意事項

- **僅支援 Web 平台**：Native build 需改用 Cocos 的 `WebView` 元件
- **不要直接編輯 `SlotUI.ts` 的 `_injectUI`**：由 `generate_slotui.js` 自動產生，修改會被覆蓋
- **不要直接編輯 `dist/slot-control.html`**：由 `build.js` 自動產生，修改會被覆蓋
- **EventBus 必須設定**：若未在 `SlotController.ts` 加入 `EventBus.emit`，balance / totalWin / totalBet 不會即時更新
- **z-index**：UI 容器預設 `z-index: 9999`，如有衝突請修改 `slot-control-base.html` 的 `#slot-ctrl-root` 樣式
- **多個實例**：請勿在同一頁面重複掛載，會導致事件重複觸發
- **generate-connector.js** 需要 `ANTHROPIC_API_KEY` 環境變數，且依賴 `client-55` 的參考實作
