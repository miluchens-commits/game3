# 3D Lobby 系統 — 設計計畫

## 可行性分析

| 項目 | 可行性 | 難度 | 說明 |
|------|--------|------|------|
| 3D 場景 | ✅ 可行 | ★★☆ | Three.js 已在用，建模大廳場景 |
| 方塊人角色 | ✅ 可行 | ★★☆ | 重複使用現有方塊人，加入 idle/walk 動畫 |
| 第三人稱攝影機 | ✅ 可行 | ★★☆ | 簡單的 follow cam，OrbitControls-like |
| 角色移動 | ✅ 可行 | ★☆☆ | WASD + 碰撞檢測 |
| 平台觸發傳送 | ✅ 可行 | ★★☆ | Raycaster / 區域檢測 |
| UI 重新排列 | ✅ 可行 | ★☆☆ | 純 CSS 調整 |
| 多人 Lobby 同步 | ⚠️ 可行 | ★★★★ | 需新 WebSocket message type、位置廣播 |
| 取消舊配對流程 | ⚠️ 可行 | ★★★ | 需改 server.js lobby 房管理 |
| 遊戲進出轉換 | ⚠️ 可行 | ★★★ | 狀態機管理 lobby/game 切換 |

**總評：可行，但建議分四階段執行。**

---

## 架構概覽

```
┌─────────────────────────────────────┐
│  LobbyScene (Three.js Scene)        │
│  ┌───────────┐  ┌─────────────────┐ │
│  │ Floor     │  │ Mode Platforms  │ │
│  │ Walls     │  │ ・單人平台       │ │
│  │ Decor     │  │ ・多人柱子 A/B   │ │
│  │ Lighting  │  │ ・（預留）       │ │
│  └───────────┘  └─────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Player (Block Character)       │ │
│  │ ・Third-person camera          │ │
│  │ ・WASD movement                │ │
│  │ ・Idle / Walk animation        │ │
│  │ ・Custom color sync            │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ UI Overlay (HTML)              │ │
│  │ ・Top bar: 資料/任務/成就/商店  │ │
│  │ ・Bottom bar: 武器庫/設定/好友  │ │
│  │            /排行/離開           │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Phase 1：單機 Lobby（核心）

### 新檔案：`lobby.js`

獨立檔案，匯入現有 Three.js 場景。

### Lobby 場景

- 地板：深色金屬質感格線地面（100×100 單位）
- 周圍：半透明發光邊界牆（非實際阻擋）
- 頂光 + 環境光 + 動態點光
- 背景：星空或都市剪影（靜態）

### 模式平台

| 平台 | 位置 | 特效 | 觸發 |
|------|------|------|------|
| 單人模式 | 左前方 | 藍色旋轉光圈 + 粒子上升 | 站上 2 秒 → 「傳送中…」→ 進單人 |
| 多人 2P 柱子 A | 右前方左側 | 紅色能量柱 | 站上 → 等待 B |
| 多人 2P 柱子 B | 右前方右側 | 紅色能量柱 | 站上 → 齊全 → 進多人 |
| UFO 模式 | 左後方 | 紫色螺旋光 | 站上 2 秒 → 傳送 |
| 炸彈模式 | 右後方 | 橙色脈衝光 | 站上 2 秒 → 傳送 |
| 射擊訓練 | 左後方（旁） | 綠色靶心光 | 站上 2 秒 → 傳送 |

### 方塊人角色

沿用現有 `blockCharacter` 邏輯：

```js
// 角色結構
body: BoxGeometry(0.8, 0.6, 0.4)    // 軀幹
head: BoxGeometry(0.35, 0.35, 0.35) // 頭
armL/armR: BoxGeometry(0.15, 0.5, 0.15) // 手臂
legL/legR: BoxGeometry(0.2, 0.5, 0.2)   // 雙腿
```

動畫：
- **Idle**：角色微微上下浮動（呼吸感）
- **Walk**：手臂前後擺動 ±30°，雙腿前後擺動 ±25°
- 使用 `requestAnimationFrame` 時間驅動，不靠骨骼動畫

顏色：讀取 `playerColor` / `localStorage`，同步材質顏色。

### 第三人稱攝影機

- 跟隨角色，偏後上方（距離 6，高度 4）
- 滑鼠拖曳可旋轉視角（OrbitControls 約束）
- 滾輪可拉近拉遠（距離 3~10）

### 狀態機

```
LOBBY_IDLE → PLATFORM_ENTER → COUNTDOWN → LOADING → IN_GAME
                                                      ↓
                                              GAME_END → LOBBY_IDLE
```

### 轉場效果

- 進入遊戲：畫面暗化 → 「傳送中…」文字 → 卸載 Lobby → 載入遊戲
- 回選單：卸載遊戲 → 載入 Lobby

---

## Phase 2：UI 重新配置

保留所有原按鈕及其功能，重新排列位置：

### 頂部列

```
[👤 個人資料] [📋 任務] [🏅 成就] [🏪 商店]       [🪙 特種幣 $X] [⚡ SP: X] [Lv.X] [S2]
```

### 底部列

```
[🔫 武器庫] [⚙ 設定] [👥 好友] [📊 排行榜] [🚪 離開]
```

- 使用原有 CSS 動畫與 hover 效果
- 只在 Lobby 模式顯示，遊戲中隱藏
- 按鈕點擊彈出原有 overlay（不改功能）

---

## Phase 3：多人 Lobby 同步

### Server 端新增

```js
// 新 message types
ws.on('lobby_join')     // 加入 Lobby 房間
ws.on('lobby_leave')    // 離開 Lobby
ws.on('lobby_move')     // 位置/旋轉/動畫更新
ws.on('lobby_platform') // 站上/離開平台

// 廣播給同房間所有人
broadcast('lobby_state', { players: [...] })
broadcast('lobby_player_move', { id, pos, rot, anim })
broadcast('lobby_platform_ready', { platform, players })
```

### 同步資料

每位玩家每幀（或 throttle 50ms）發送：
```js
{
  type: 'lobby_move',
  position: [x, y, z],
  rotation: y,          // 僅 Y 軸
  animation: 'idle' | 'walk',
  color: '#ff6644'
}
```

### 配對流程（取代舊版）

```
玩家進入 Lobby → 加入 Lobby Room
  → 走到多人柱子 A/B
    → 發送 lobby_platform { platform: 'multi2_A' }
    → 柱子亮起對應顏色
    → 當 2 人都站上 → 伺服器發送 startMultiGame
    → 所有人切換至遊戲
```

---

## Phase 4：整合與測試

### 檔案拆分建議

| 檔案 | 內容 |
|------|------|
| `lobby.js` | Lobby 場景、角色、攝影機、平台邏輯 |
| `lobby-sync.js` | 多人同步邏輯 |
| `lobby-ui.js` | Lobby UI 按鈕控制 |
| `game.js` | 現有遊戲邏輯（從 index.html 抽出） |
| `server.js` | 更新後臺（加入 Lobby 支援） |
| `index.html` | 入口 + UI HTML |

### 風險與緩衝

| 風險 | 影響 | 緩衝方案 |
|------|------|----------|
| Lobby + Game 場景互相干擾 | 高 | 獨立 Scene、獨立 render loop |
| 多人同步延遲造成卡頓 | 中 | Interpolation + throttle 50ms |
| 手機效能不足 | 中 | Lobby 簡化版（低品質材質） |
| 檔案過大難以維護 | 中 | 拆檔案，模組化 |
| 轉場時 WebSocket 斷線 | 高 | 保持連線，room 不變 |

---

## 建議執行順序

```
Phase 1 (單機 Lobby) ▸ Phase 2 (UI 配置) ▸ Phase 3 (多人同步) ▸ Phase 4 (整合測試)

每階段完成後都可獨立運作，不需等全部做完。
```

---

## 粗略時程估計

| 階段 | 預估新增行數 | 預估工時 |
|------|------------|----------|
| Phase 1: 單機 Lobby | ~1200 行 | 主要工作 |
| Phase 2: UI 配置 | ~200 行 | 簡單 |
| Phase 3: 多人同步 | ~800 行 server + ~500 行 client | 中等 |
| Phase 4: 測試修復 | 不定 | 視 Bug 數量 |
| **總計** | **~2700+ 行** | **最大專案** |

---

## 我個人的建議

這是一個非常 ambitious 的改版，幾乎等於重做前端架構。我會建議：

1. **先跑 Phase 1** 確定 Lobby 體驗是你要的
2. **不要一次改到底**，每階段完成後上線測試
3. **接受可能原有的 Bug**，因為改動太大難免有 regression

如果你確定要做，我可以從 Phase 1 開始建立 `lobby.js`。
