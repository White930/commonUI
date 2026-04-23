#!/usr/bin/env node
/**
 * generate-connector.js — 用 Claude AI 自動分析遊戲專案，生成 SlotUIConnector.ts
 *
 * Usage:
 *   node generate-connector.js <client>
 *   node generate-connector.js client-55
 *   node generate-connector.js client-59
 *
 * 需要設定環境變數（或在 .env 檔案中）：
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * 輸出：
 *   <client>/assets/scripts/game/machine/SlotUIConnector.ts  (Cocos 專案)
 */

'use strict';

const os   = require('os');
const fs   = require('fs');
const path = require('path');
const https = require('https');

/* ── 路徑 ── */
const DOCS = path.join(os.homedir(), 'Documents');
const SRC  = __dirname;

/* ── 參數 ── */
const clientArg = process.argv[2];

if (!clientArg) {
  console.error('✘ 使用方式：node generate-connector.js <client>');
  console.error('   範例：node generate-connector.js client-55');
  process.exit(1);
}

const PROJECT = path.join(DOCS, clientArg);
if (!fs.existsSync(PROJECT)) {
  console.error('✘ 專案目錄不存在：', PROJECT);
  process.exit(1);
}

/* ── API Key ── */
// 嘗試讀取 .env（簡易解析）
const envFile = path.join(SRC, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  });
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('✘ 請設定環境變數 ANTHROPIC_API_KEY');
  console.error('   或在 commonUI/.env 建立：ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

/* ── 工具函式 ── */
function readFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function findFiles(dir, pattern) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(entry => {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (pattern.test(entry.name)) results.push(full);
    });
  }
  walk(dir);
  return results;
}

function findFile(dir, name) {
  const all = findFiles(dir, new RegExp('^' + name + '$'));
  return all.length ? all[0] : null;
}

/* ── 偵測專案類型 ── */
function detectProjectType(projectDir) {
  const assetsDir = path.join(projectDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    // Cocos Creator 專案有 assets 目錄且包含 .ts 腳本
    const tsFiles = findFiles(assetsDir, /\.ts$/);
    if (tsFiles.length > 0) return 'cocos';
  }
  return 'pixi';
}

/* ── 讀取 Cocos 專案的關鍵檔案 ── */
function gatherCocosContext(projectDir) {
  const scriptsDir = path.join(projectDir, 'assets', 'scripts');
  const context = {};

  const keyFiles = [
    'Machine.ts',
    'Controller.ts',
    'EventManager.ts',
    'Constants.ts',
    'DataManager.ts',
    'GameInformation.ts',
    'Game.ts',
    'Reel.ts',
    'AutoSpin.ts',
  ];

  for (const name of keyFiles) {
    const found = findFile(scriptsDir, name);
    if (found) {
      const rel = path.relative(projectDir, found);
      context[rel] = readFile(found);
      console.log('  ✓ 讀取：' + rel);
    }
  }

  return context;
}

/* ── 組合 Prompt ── */
function buildPrompt(clientName, projectType, filesMap, referenceConnector, slotUIEvents) {
  const fileBlocks = Object.entries(filesMap).map(([name, content]) => {
    // 限制每個檔案最多 300 行避免超過 token 限制
    const lines = content.split('\n');
    const truncated = lines.length > 300
      ? lines.slice(0, 300).join('\n') + '\n... [truncated, ' + (lines.length - 300) + ' more lines]'
      : content;
    return '### ' + name + '\n```typescript\n' + truncated + '\n```';
  }).join('\n\n');

  return `你是一個專業的遊戲前端工程師。你的任務是為 Cocos Creator 3.x 遊戲專案 "${clientName}" 生成一個 SlotUIConnector TypeScript 組件。

## 背景說明

slot-ui 是一個外部 HTML UI 控制面板，透過 window.dispatchEvent(CustomEvent) 與遊戲引擎雙向溝通。

## slot-ui 事件 API

### 遊戲 → UI（推播，game 呼叫 window.dispatchEvent）：
- \`slotControl:setBalance\`       { balance: number }
- \`slotControl:setTotalWin\`      { totalWin: number }
- \`slotControl:setTotalBet\`      { totalBet: number }
- \`slotControl:setBetRange\`      { minBet: number, maxBet: number }
- \`slotControl:setBetStep\`       { betStep: number }
- \`slotControl:setSpinning\`      { spinning: boolean }
- \`slotControl:setSpeedMode\`     { modeIndex: 0|1|2 }  (0=normal, 1=fast, 2=turbo)
- \`slotControl:setAutoSpinning\`  { running: boolean, remaining: number }

### UI → 遊戲（遊戲監聽，game 呼叫 window.addEventListener）：
- \`slotControl:spin\`                { bet, speed }
- \`slotControl:spinStop\`            { bet }
- \`slotControl:betChange\`           { totalBet, direction: 'up'|'down' }
- \`slotControl:speedChange\`         { mode: 'normal'|'fast'|'turbo', modeIndex: 0|1|2 }
- \`slotControl:settingsSpeedChange\` { speed: 'normal'|'fast'|'turbo' }
- \`slotControl:autoSpinStart\`       { bet, spins: number (-1=unlimited), speed, speedIndex, untilFeature }
- \`slotControl:autoSpinStop\`        {}
- \`slotControl:menuHistory\`         {}
- \`slotControl:menuFullscreen\`      {}
- \`slotControl:menuHowToPlay\`       {}
- \`slotControl:settingsFavoriteChange\` { on: boolean }

## 參考實作（client-55 的 SlotUIConnector）

\`\`\`typescript
${referenceConnector}
\`\`\`

## 目標專案的遊戲原始碼

${fileBlocks}

## 任務

請分析以上遊戲原始碼，生成適合 "${clientName}" 的 SlotUIConnector.ts：

1. **找出正確的 API**：
   - 如何取得 Machine/Controller singleton
   - 如何取得餘額（credit/balance）
   - 如何取得總押注（totalBet）
   - 如何取得贏分（spinData 中的 pay_credit_total 或類似欄位）
   - 如何觸發旋轉（clickSpinButton 或類似方法）
   - 如何更改押注（changeBet 或類似方法）
   - 如何設定速度模式（setSpinMode 或類似方法）
   - 如何控制 autoSpin
   - 如何觸發歷史、全螢幕、遊戲說明
   - EventManager 監聽遊戲事件（START_SPIN, FINISH_SPIN 等）的確切 EventType 名稱

2. **生成完整可用的 TypeScript 組件**：
   - import 路徑必須正確（相對於 assets/scripts/game/machine/ 目錄）
   - 使用 @ccclass decorator
   - 包含 onLoad、onDestroy、_pushInitState
   - 處理所有 slot-ui 事件
   - 加入繁體中文或英文的說明註解

3. **若某些 API 在提供的程式碼中找不到**，請在該處加上 TODO 注釋說明需要確認的內容。

請直接輸出完整的 TypeScript 程式碼，不要包含 markdown 說明文字，只輸出 \`\`\`typescript ... \`\`\` 程式碼區塊。`;
}

/* ── 呼叫 Claude API ── */
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const options = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length':    Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error('API Error: ' + parsed.error.message));
          } else {
            resolve(parsed.content?.[0]?.text || '');
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/* ── 從 AI 回應中提取 TypeScript 程式碼 ── */
function extractCode(response) {
  // 嘗試提取 ```typescript ... ``` 或 ``` ... ```
  const match = response.match(/```(?:typescript)?\n([\s\S]*?)```/);
  if (match) return match[1].trim();
  // 若沒有 code block，直接回傳全文
  return response.trim();
}

/* ── 主流程 ── */
async function main() {
  console.log('→ 專案：' + clientArg);

  const projectType = detectProjectType(PROJECT);
  console.log('→ 類型：' + projectType);

  if (projectType !== 'cocos') {
    console.error('✘ 目前只支援 Cocos Creator 專案');
    console.error('   PixiJS 專案請使用 deploy-pixi.js 手動整合 SlotUIConnector.js');
    process.exit(1);
  }

  /* 讀取參考實作 */
  const referenceConnector = readFile(
    path.join(DOCS, 'client-55', 'assets', 'scripts', 'game', 'machine', 'SlotUIConnector5500.ts')
  );
  if (!referenceConnector) {
    console.error('✘ 找不到參考實作 SlotUIConnector5500.ts（client-55）');
    process.exit(1);
  }

  /* 讀取目標專案原始碼 */
  console.log('\n讀取目標專案原始碼…');
  const filesMap = gatherCocosContext(PROJECT);
  if (Object.keys(filesMap).length === 0) {
    console.error('✘ 找不到任何 TypeScript 原始碼');
    process.exit(1);
  }

  /* 組合 prompt */
  const prompt = buildPrompt(clientArg, projectType, filesMap, referenceConnector, null);

  /* 呼叫 Claude */
  console.log('\n呼叫 Claude AI 生成 SlotUIConnector…');
  let response;
  try {
    response = await callClaude(prompt);
  } catch (err) {
    console.error('✘ API 呼叫失敗：', err.message);
    process.exit(1);
  }

  /* 提取程式碼 */
  const code = extractCode(response);
  if (!code) {
    console.error('✘ AI 回應中找不到程式碼');
    console.log('原始回應：\n', response);
    process.exit(1);
  }

  /* 決定輸出路徑 */
  const machineDir = findFile(path.join(PROJECT, 'assets', 'scripts'), 'Machine.ts');
  const outputDir  = machineDir ? path.dirname(machineDir) : path.join(PROJECT, 'assets', 'scripts', 'game', 'machine');
  const outputPath = path.join(outputDir, 'SlotUIConnector.ts');

  /* 儲存 */
  fs.writeFileSync(outputPath, code, 'utf8');
  const rel = path.relative(DOCS, outputPath);
  console.log('\n✓ 已生成：' + rel);
  console.log('\n下一步：');
  console.log('  1. 在 Cocos 編輯器開啟 ' + clientArg + ' 專案');
  console.log('  2. 將 SlotUIConnector.ts 拖曳到場景的任意節點（如 Canvas）');
  console.log('  3. 在瀏覽器開啟預覽確認 slot-ui 正常運作');
  console.log('  4. 若有 TODO 標記，請依提示補齊對應的 API 呼叫');
}

main().catch(err => {
  console.error('✘ 執行失敗：', err.message);
  process.exit(1);
});
