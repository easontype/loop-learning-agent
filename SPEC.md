# Lingua A8 — AI 全雙工語言對話教學系統

> 版本：0.1 | 日期：2026-06-25 | 作者：AI八爪貓

---

## 一、專案概述

Lingua A8 是一套以 GPT-Realtime-2 為核心的全雙工語音對話語言教學系統。  
學習者可以像與真人對話一樣自然地練習英文或日文，隨時打斷、隨時回應，  
並搭配可動態更換的單字庫，系統自動記錄每次學習狀況。

### 核心差異點
- **全雙工**：真正的即時對話，可打斷，不是 push-to-talk
- **單字庫可插拔**：依課程/考試目標更換詞彙組（JLPT、TOEIC、自定義）
- **學習記錄**：每個詞的接觸次數、使用情況、錯誤都有紀錄
- **角色設定**：可切換 AI 角色（日本朋友、外籍老師、面試官…）

---

## 二、使用情境

### 當前階段（自用）
- 本地 Next.js 跑在 localhost
- 單人使用，快速迭代功能
- 重點在對話品質與單字庫機制

### 未來階段（App）
- 包成 Electron 桌面應用
- 或 PWA 手機版
- 多用戶帳號 + 雲端同步

---

## 三、技術棧

| 層 | 技術 | 選擇原因 |
|----|------|---------|
| 前端框架 | Next.js 15（App Router） | 同一套可包 Electron / PWA |
| 語言 | TypeScript | 型別安全，長期維護 |
| 樣式 | Tailwind CSS v4 | 快速開發 |
| 即時通訊 | WebSocket（原生） | GPT-Realtime-2 必須 |
| 音訊處理 | Web Audio API + AudioWorklet | 瀏覽器原生，低延遲 |
| AI 核心 | OpenAI GPT-Realtime-2 API | 真全雙工，支援 barge-in |
| 資料庫 | SQLite（better-sqlite3） | 自用期輕量，之後遷 PostgreSQL |
| ORM | Drizzle ORM | 輕量，型別安全，SQLite 支援好 |
| 套件管理 | pnpm | 快，磁碟效率好 |

---

## 四、系統架構

```
┌─────────────────────────────────────────────────────┐
│                   瀏覽器（前端）                      │
│                                                     │
│  麥克風 → AudioWorklet → PCM 音訊串流                │
│  喇叭  ← AudioContext  ← PCM 音訊串流                │
│                    ↕ WebSocket                      │
└─────────────────────────────────────────────────────┘
                         │
                         │ WebSocket（/api/realtime）
                         │
┌─────────────────────────────────────────────────────┐
│               Next.js 後端（API Routes）              │
│                                                     │
│  ┌─────────────────┐    ┌──────────────────────┐   │
│  │  Session 管理   │    │   System Prompt 組裝  │   │
│  │  (WebSocket     │    │   - 角色設定          │   │
│  │   Proxy)        │    │   - 今日單字注入       │   │
│  └────────┬────────┘    └──────────┬───────────┘   │
│           │                        │               │
│  ┌────────▼────────────────────────▼───────────┐   │
│  │              Tool Handler                   │   │
│  │  - get_word_definition()                    │   │
│  │  - mark_word_practiced()                    │   │
│  │  - log_mistake()                            │   │
│  │  - get_next_word()                          │   │
│  └─────────────────────┬───────────────────────┘   │
└────────────────────────│────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
┌────────▼─────┐ ┌───────▼──────┐ ┌─────▼──────────┐
│ OpenAI       │ │   SQLite DB  │ │  外部詞彙 API   │
│ Realtime API │ │  (Drizzle)   │ │  JMdict / Free  │
│              │ │              │ │  Dictionary API │
└──────────────┘ └──────────────┘ └─────────────────┘
```

---

## 五、核心功能規格

### 5.1 全雙工對話引擎

- **連線方式**：瀏覽器 ↔ Next.js WebSocket Proxy ↔ GPT-Realtime-2
- **音訊格式**：PCM 16-bit, 24kHz（GPT-Realtime-2 規格）
- **Barge-in**：用戶說話時，AI 立即停止並重新回應
- **VAD**：伺服器端 VAD，由 GPT-Realtime-2 處理
- **Session 長度**：最長 60 分鐘（API 限制）

### 5.2 角色系統（Persona）

可設定的角色參數：

```typescript
interface Persona {
  name: string           // 角色名稱，例如 "Yuki"
  language: "en" | "ja" // 對話語言
  style: "casual" | "formal" | "teacher" | "friend"
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"  // CEFR
  correction_style: "gentle" | "strict" | "none"
  voice: string          // OpenAI voice ID
}
```

### 5.3 單字庫系統

**注入機制**：每次 Session 開始前，從 DB 取出當日單字，組成 prompt 片段：

```
今日練習詞彙（請在對話中自然使用或提問）：
1. ephemeral [ɪˈfem.ər.əl]（短暫的）— The ephemeral beauty of cherry blossoms.
2. ...
```

**詞彙來源（Phase 2 匯入）**：

| 來源 | 語言 | 說明 | 取得方式 |
|------|------|------|---------|
| JMdict | 日文 | 最完整日英詞典，20萬+ 詞條 | 下載 XML，一次性匯入 |
| JLPT N5-N1 詞表 | 日文 | 依程度分級 | GitHub 現成 JSON |
| COCA 60000 | 英文 | 依字頻排序 | 免費下載 |
| Free Dictionary API | 英文 | 即時查詞定義 | REST API，無需 key |
| Tatoeba | 英/日 | 例句資料庫 | 下載 TSV |

### 5.4 Tool Calling

AI 在對話中可主動呼叫：

| Tool | 說明 |
|------|------|
| `get_word_definition(word)` | 查詞定義 + 例句（查本地 DB 或 Free Dictionary API） |
| `mark_word_practiced(word, quality)` | 記錄單字已練習，quality 1-5 |
| `log_mistake(word, mistake_type, context)` | 記錄學習者的錯誤 |
| `get_next_word()` | 取下一個應複習的單字（依 SRS 演算法） |

### 5.5 學習記錄

每次 Session 記錄：
- 開始/結束時間、語言、角色
- 對話逐字稿（text transcript）
- 練習過的單字清單
- 錯誤清單（語法、發音、用詞）
- AI 評估的流暢度分數

---

## 六、資料庫 Schema

```sql
-- 單字
CREATE TABLE words (
  id          INTEGER PRIMARY KEY,
  word        TEXT NOT NULL,
  language    TEXT NOT NULL,        -- 'en' | 'ja'
  reading     TEXT,                 -- 日文假名發音
  definition  TEXT NOT NULL,
  example     TEXT,
  level       TEXT,                 -- CEFR / JLPT
  source      TEXT,                 -- 'jmdict' | 'jlpt' | 'coca' | 'custom'
  created_at  INTEGER DEFAULT (unixepoch())
);

-- 單字學習進度（SRS）
CREATE TABLE word_progress (
  id           INTEGER PRIMARY KEY,
  word_id      INTEGER REFERENCES words(id),
  ease_factor  REAL DEFAULT 2.5,    -- SM-2 算法
  interval     INTEGER DEFAULT 1,   -- 下次複習間隔（天）
  repetitions  INTEGER DEFAULT 0,
  next_review  INTEGER,             -- unix timestamp
  updated_at   INTEGER DEFAULT (unixepoch())
);

-- 對話 Session
CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY,
  language    TEXT NOT NULL,
  persona     TEXT NOT NULL,        -- JSON
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  duration_s  INTEGER,
  transcript  TEXT                  -- 全文逐字稿 JSON
);

-- 錯誤記錄
CREATE TABLE mistakes (
  id           INTEGER PRIMARY KEY,
  session_id   INTEGER REFERENCES sessions(id),
  word_id      INTEGER REFERENCES words(id),
  mistake_type TEXT,                -- 'grammar' | 'pronunciation' | 'usage'
  context      TEXT,                -- 當時的句子
  created_at   INTEGER DEFAULT (unixepoch())
);

-- Session 練習的單字（多對多）
CREATE TABLE session_words (
  session_id  INTEGER REFERENCES sessions(id),
  word_id     INTEGER REFERENCES words(id),
  practiced   INTEGER DEFAULT 0,    -- 1 = 有用到
  quality     INTEGER,              -- 1-5，SM-2 用
  PRIMARY KEY (session_id, word_id)
);
```

---

## 七、目錄結構

```
D:\lingua-a8\
├── SPEC.md                    ← 本規格書
├── package.json
├── next.config.ts
├── drizzle.config.ts
│
├── src/
│   ├── app/
│   │   ├── page.tsx           ← 主頁（進入對話）
│   │   ├── dashboard/         ← 學習進度 Dashboard
│   │   │   └── page.tsx
│   │   ├── words/             ← 單字庫管理
│   │   │   └── page.tsx
│   │   └── api/
│   │       ├── realtime/
│   │       │   └── route.ts   ← WebSocket Proxy → GPT-Realtime-2
│   │       ├── words/
│   │       │   └── route.ts   ← 單字 CRUD
│   │       └── sessions/
│   │           └── route.ts   ← Session 記錄
│   │
│   ├── components/
│   │   ├── ConversationView.tsx   ← 對話主畫面
│   │   ├── AudioVisualizer.tsx    ← 音波視覺化
│   │   ├── PersonaSelector.tsx    ← 角色選擇
│   │   ├── WordList.tsx           ← 今日單字列表
│   │   └── ProgressCard.tsx       ← 學習進度卡片
│   │
│   ├── lib/
│   │   ├── db.ts              ← Drizzle 初始化
│   │   ├── schema.ts          ← DB Schema 定義
│   │   ├── realtime.ts        ← GPT-Realtime-2 WebSocket 封裝
│   │   ├── prompt.ts          ← System prompt 組裝器
│   │   ├── srs.ts             ← SM-2 間隔複習演算法
│   │   └── vocab/
│   │       ├── jmdict.ts      ← JMdict 匯入器
│   │       ├── jlpt.ts        ← JLPT 詞表匯入器
│   │       └── coca.ts        ← COCA 詞表匯入器
│   │
│   └── types/
│       └── index.ts           ← 共用型別定義
│
├── db/
│   └── lingua.db              ← SQLite 資料庫
│
└── scripts/
    ├── import-jmdict.ts       ← 一次性匯入日文詞典
    ├── import-jlpt.ts         ← 匯入 JLPT 分級詞表
    └── import-coca.ts         ← 匯入 COCA 英文字頻表
```

---

## 八、開發階段

### Phase 1 — 全雙工對話跑通（目標：1-2 天）

- [ ] Next.js 專案初始化（TypeScript + Tailwind）
- [ ] GPT-Realtime-2 WebSocket Proxy 實作（`/api/realtime`）
- [ ] 瀏覽器音訊串流（麥克風輸入 + 喇叭輸出）
- [ ] 基本對話 UI（說話狀態顯示、音波視覺化）
- [ ] System prompt 基本設定（語言 + 角色）
- [ ] **成功標準**：可以用麥克風自然對話，能打斷 AI

### Phase 2 — 單字庫（目標：2-3 天）

- [ ] SQLite + Drizzle ORM 設定
- [ ] 匯入 JLPT N5-N1 詞表（JSON → DB）
- [ ] 匯入 COCA 英文常用詞（CSV → DB）
- [ ] System prompt 動態注入今日單字
- [ ] Tool calling 實作（`mark_word_practiced`, `get_word_definition`）
- [ ] **成功標準**：AI 會在對話中使用/詢問今日單字

### Phase 3 — 學習記錄（目標：2-3 天）

- [ ] Session 記錄（開始/結束/逐字稿）
- [ ] 錯誤記錄（`log_mistake` tool）
- [ ] SM-2 間隔複習演算法（`srs.ts`）
- [ ] 基本 Dashboard（練習時長、單字進度）
- [ ] **成功標準**：每次對話後看得到學習統計

### Phase 4 — 打磨（之後）

- [ ] 角色商店（多個 persona 可選）
- [ ] 匯入 JMdict 完整日文詞典
- [ ] 進階 Dashboard（錯誤熱點、進步曲線）
- [ ] Electron 打包

---

## 九、成本估算

| 項目 | 費用 |
|------|------|
| GPT-Realtime-2 音訊輸入 | $0.006 / 分鐘 |
| GPT-Realtime-2 音訊輸出 | $0.024 / 分鐘 |
| **每分鐘對話合計** | **≈ $0.03 / 分鐘** |
| 每天練習 30 分鐘 | ≈ $0.9 / 天 |
| 每月 | ≈ $27 / 月 |

> 文字 token 費用另計，但語言學習情境文字量少，影響有限。

---

## 十、環境變數

```env
# .env.local
OPENAI_API_KEY=sk-...
```

---

*規格書持續更新，以實際開發為準。*
