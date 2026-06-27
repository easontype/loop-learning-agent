# Lingua A8 — AI 全雙工語言對話教學系統

> 版本：0.3 | 日期：2026-06-27 | 作者：AI八爪貓

---

## 一、專案概述

Lingua A8 是一套以 GPT-Realtime-2 為核心的全雙工語音對話語言教學系統。
學習者可以像與真人對話一樣自然地練習英文或日文，隨時打斷、隨時回應，
並搭配可動態更換的單字庫，系統自動記錄每次學習狀況。

### 核心差異點
- **全雙工**：真正的即時對話，可打斷，不是 push-to-talk
- **固定 token 開銷**：initial input token 固定 300-500，不隨使用時間增長
- **單字庫可插拔**：依課程/考試目標更換詞彙組（JLPT、TOEIC、自定義）
- **學習記錄**：SM-2 間隔複習，每個詞的接觸次數、品質、錯誤都有紀錄
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
| 前端框架 | Next.js 16（App Router） | 同一套可包 Electron / PWA |
| 語言 | TypeScript | 型別安全，長期維護 |
| 樣式 | Tailwind CSS v4 | 快速開發 |
| 即時通訊 | WebSocket（前端直連 OpenAI） | GPT-Realtime-2 必須，方案 A |
| 音訊處理 | Web Audio API + AudioWorklet | 瀏覽器原生，低延遲 |
| AI 核心 | OpenAI GPT-Realtime-2 mini | 全雙工，barge-in，成本低 |
| 向量庫 | LanceDB（embedded） | 無需 server，TS + Python 共用 |
| 本地模型 | Qwen2.5-14B Q3_K_M via Ollama | async 後處理，RTX 4060，零 API 成本 |
| Embedding | fastembed bge-small（CPU） | 不搶 Qwen VRAM |
| 資料庫 | SQLite + WAL（better-sqlite3） | 自用期輕量 |
| ORM | Drizzle ORM | 輕量，型別安全 |
| 套件管理 | pnpm | 快，磁碟效率好 |

---

## 四、系統架構

### 整體資料流（三條線）

\\\
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 A. Session 啟動（initial token 控制）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

前端 POST /api/session
  → SQL 查 SRS 到期單字（5-8 個）
  → LanceDB RAG 撈相關記憶（2-3 條）
  → 組 system prompt（固定前綴 → 動態後綴，確保 Prompt Cache 命中）
  → 取 OpenAI client secret → 回前端

前端直連 wss://api.openai.com/v1/realtime
  → session.update 宣告 tools + instructions + voice

初始 input token：約 300-500，固定不隨使用時間增長

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 B. 即時對話中（in-session，熱路徑）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

麥克風 → AudioWorklet PCM16 24kHz → WebSocket → OpenAI Realtime
                                               ↓
                                   GPT-Realtime-2 mini
                                               ↓
  audio output ──────────────────────→ 前端播放
  transcript delta（邏輯通道）────────→ 前端顯示逐字稿
  tool_call JSON（靜默）──────────────→ 前端攔截
                                               ↓ tool_call
                               前端 POST /api/tools（HTTP）
                                 ├── get_next_word()       → SQL 查 SRS
                                 └── get_word_definition() → SQLite / Free Dict
                                               ↓ tool result
                               前端送 conversation.item.create → OpenAI 繼續

  【每 10 秒 debounce】前端 POST /api/transcript/append → 增量寫 transcript_items

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 C. Session 結束後（async，冷路徑）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

前端 POST /api/session/end
  → sessions.ended_at 寫入
  → jobs table 插入 status=pending

Worker loop（單一 consumer，序列化）
  → 讀 transcript_items
  → Qwen2.5-14B（Ollama）分析
  → 輸出 JSON：word_quality + mistakes + session_summary
  → 驗證 schema（詞必須出現在 transcript，quality 0-5）
  → 一個 transaction 內寫入：
      SM-2 更新 word_progress
      mistakes table
      session_words
  → session_summary → fastembed（CPU）→ LanceDB
  → jobs.status = done

失敗：attempts++ 最多重試 3 次，超過進 dead-letter，壞資料不進 DB
\\\

### WS 終結點（ADR-01）
現階段採**方案 A**：前端持 WS + 後端 HTTP 工具 API。
方案 B（後端 relay）在 Phase 3 後評估。

---

## 五、核心功能規格

### 5.1 全雙工對話引擎

- **連線方式**：瀏覽器直連 OpenAI Realtime WS（client secret 由 /api/session 簽發）
- **音訊格式**：PCM 16-bit, 24kHz
- **Barge-in**：用戶說話時送 conversation.item.truncate + 停止所有 AudioBufferSource
- **VAD**：伺服器端 semantic_vad
- **Session 長度**：最長 60 分鐘

### 5.2 角色系統（Persona）

\\\	ypescript
interface Persona {
  id: string
  name: string
  language: "en" | "ja"
  style: "casual" | "formal" | "teacher" | "friend"
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  correctionStyle: "gentle" | "strict" | "none"
  voice: RealtimeVoice
  description: string
}
\\\

### 5.3 單字庫系統

**System prompt 結構（順序固定，影響 Prompt Cache 命中率）**：
\\\
[固定前綴：角色、規則、語言指令]   ← Cache 命中這段
[動態後綴：今日單字 + 相關記憶]   ← 每次 session 不同
\\\

**SRS 熱查詢**（必須有索引）：
\\\sql
SELECT w.word, w.reading, w.definition, w.example
FROM word_progress wp JOIN words w ON w.id = wp.word_id
WHERE wp.next_review <= unixepoch()
ORDER BY wp.next_review ASC, wp.ease_factor ASC
LIMIT 8
\\\

**詞彙來源（Phase 2 匯入）**：

| 來源 | 語言 | 取得方式 |
|------|------|---------|
| JLPT N5-N1 詞表 | 日文 | GitHub JSON |
| COCA 60000 | 英文 | 免費下載 CSV |
| JMdict | 日文 | 下載 XML（Phase 4） |
| Free Dictionary API | 英文 | REST API，無需 key |

### 5.4 Tool Calling（in-session，只讀）

**設計原則（ADR-02）**：in-session 工具只讀，不寫 DB。寫入統一由 async Qwen 負責。

觸發流程：OpenAI 邏輯通道靜默輸出 JSON → 前端收到 → POST /api/tools → 後端查 DB → 回前端 → 前端送 conversation.item.create → 模型繼續語音。

| Tool | 說明 |
|------|------|
| \get_next_word()\ | SQL 查 SRS 到期詞 |
| \get_word_definition(word)\ | SQLite 或 Free Dictionary API |

> mark_word_practiced / log_mistake 已降級，不作為 SM-2 真值來源。

### 5.5 Async Pipeline（Qwen 後處理）

**Qwen 輸出格式**：
\\\json
{
  "word_quality": { "ephemeral": 3, "ubiquitous": 4 },
  "mistakes": [
    { "type": "grammar", "context": "I go yesterday", "correction": "I went yesterday" }
  ],
  "session_summary": "練習了過去式動詞，ephemeral 不熟，整體進步..."
}
\\\

驗證規則：
- 詞必須出現在本次 transcript
- quality 範圍 0-5
- 驗證失敗 → jobs.status=failed，保留 transcript，等待重試

### 5.6 學習記憶層（RAG）

| | 詞彙進度 | 學習記憶 |
|--|--|--|
| 儲存 | SQLite word_progress | LanceDB |
| 查詢 | SQL（SRS 數學，決定性） | 向量語意搜尋 |
| 寫入者 | Qwen async（唯一） | Qwen async（唯一） |

LanceDB：最多注入 3 條，recency decay（90 天降權）。

---

## 六、資料庫 Schema

\\\sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE words (
  id          INTEGER PRIMARY KEY,
  word        TEXT NOT NULL,
  language    TEXT NOT NULL,
  reading     TEXT,
  definition  TEXT NOT NULL,
  example     TEXT,
  level       TEXT,
  source      TEXT,
  created_at  INTEGER DEFAULT (unixepoch()),
  UNIQUE(word, language)
);

CREATE TABLE word_progress (
  id           INTEGER PRIMARY KEY,
  word_id      INTEGER REFERENCES words(id),
  ease_factor  REAL DEFAULT 2.5,
  interval     INTEGER DEFAULT 1,
  repetitions  INTEGER DEFAULT 0,
  lapses       INTEGER DEFAULT 0,
  last_quality INTEGER,
  last_reviewed INTEGER,
  next_review  INTEGER,
  updated_at   INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_word_progress_review ON word_progress(next_review, ease_factor);

CREATE TABLE sessions (
  id          INTEGER PRIMARY KEY,
  language    TEXT NOT NULL,
  persona     TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  duration_s  INTEGER,
  processed   INTEGER DEFAULT 0
);

CREATE TABLE transcript_items (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  role       TEXT NOT NULL,
  text       TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_transcript_session ON transcript_items(session_id, seq);

CREATE TABLE mistakes (
  id           INTEGER PRIMARY KEY,
  session_id   INTEGER REFERENCES sessions(id),
  word_id      INTEGER,
  mistake_type TEXT,
  context      TEXT,
  correction   TEXT,
  created_at   INTEGER DEFAULT (unixepoch())
);

CREATE TABLE session_words (
  session_id  INTEGER REFERENCES sessions(id),
  word_id     INTEGER REFERENCES words(id),
  practiced   INTEGER DEFAULT 0,
  quality     INTEGER,
  PRIMARY KEY (session_id, word_id)
);

CREATE TABLE jobs (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL,
  session_id  INTEGER REFERENCES sessions(id),
  status      TEXT DEFAULT 'pending',
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  created_at  INTEGER DEFAULT (unixepoch()),
  updated_at  INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_jobs_status ON jobs(status, created_at);
\\\

---

## 七、目錄結構

\\\
D:\lingua-a8\
├── SPEC.md
├── package.json
├── drizzle.config.ts
│
├── app/
│   ├── page.tsx                        ✅
│   ├── dashboard/page.tsx
│   ├── words/page.tsx
│   └── api/
│       ├── session/route.ts            ✅ (SRS 查詢 + session 建立)
│       ├── session/end/route.ts        ✅
│       ├── tools/route.ts              ✅ (get_next_word / get_word_definition)
│       ├── transcript/append/route.ts  ✅
│       └── words/route.ts
│
├── components/
│   ├── ConversationView.tsx            ✅ (tool call + transcript debounce + session/end)
│   ├── AudioVisualizer.tsx             ✅
│   ├── PersonaSelector.tsx             ✅
│   ├── WordList.tsx
│   └── ProgressCard.tsx
│
├── lib/
│   ├── db.ts                   ✅ Drizzle singleton + 自動建表
│   ├── schema.ts               ✅ 7 張表的 Drizzle schema
│   ├── prompt.ts               ✅
│   ├── types.ts                ✅
│   ├── srs.ts                  ✅ SM-2 算法
│   ├── worker.ts               ← Qwen async worker（Phase 3）
│   └── lance.ts                ← LanceDB + RAG（Phase 3）
│
├── db/lingua.db                ✅ 166 詞入庫
├── drizzle.config.ts           ✅
├── scripts/
│   ├── import-jlpt.ts          ✅ N5-N2 種子 80 詞
│   └── import-coca.ts          ✅ COCA 種子 86 詞
└── public/audio-processor.js   ✅
\\\

---

## 八、開發階段

### Phase 1 — 全雙工對話跑通 ✅ 已完成

- [x] Next.js 16 + TypeScript + Tailwind v4
- [x] /api/session：client secret + system prompt
- [x] AudioWorklet PCM16 麥克風串流
- [x] AI 語音播放 + 音波視覺化（24 bar）
- [x] Barge-in（conversation.item.truncate）
- [x] PersonaSelector 4 個角色

### Phase 2 — 單字庫（✅ 完成 2026-06-27）

- [x] SQLite WAL + Drizzle schema（含 jobs、transcript_items、7 張表）
- [x] SM-2 算法（lib/srs.ts）
- [x] 匯入 JLPT N5-N2 種子詞表（80 詞）
- [x] 匯入 COCA 英文種子詞（86 詞，B1-C1）
- [x] SRS 查詢接入 system prompt（language filter + 到期排序）
- [x] Tool Handler（/api/tools，只讀：get_next_word / get_word_definition）
- [x] Transcript 增量落地（10s debounce，response.done 觸發 flush）
- [x] /api/session/end + jobs 入隊
- [x] **成功標準達成**：AI 對話中使用今日單字，逐字稿持久寫入 DB

**詞庫現況**：166 詞入庫，next_review = now（立即全部到期，首次 session 完整暴露）。
JLPT N1 完整詞表、COCA 60k 可後續替換 import script 擴充。

### Phase 3 — 學習記錄與 Async Pipeline（目標：3-4 天）

- [ ] Qwen async worker（jobs queue，單一 consumer）
- [ ] Qwen JSON schema 驗證 + 冪等 SM-2 更新
- [ ] LanceDB + CPU fastembed
- [ ] /api/session/end
- [ ] RAG 注入 system prompt
- [ ] Dashboard（練習時長、單字進度、錯誤清單）
- [ ] **成功標準**：對話後看到學習統計，第二次 session 感受到記憶注入

### Phase 4 — 打磨（之後）

- [ ] Leech 偵測（lapses > N）
- [ ] JMdict 完整日文詞典匯入
- [ ] 進階 Dashboard（錯誤熱點、進步曲線）
- [ ] LanceDB recency decay + hierarchical summary
- [ ] Electron 打包
- [ ] 評估 WS relay（方案 B）

---

## 九、成本估算

| 項目 | 費用 |
|------|------|
| GPT-Realtime-2 mini 音訊輸入 | 0.006 美元 / 分鐘 |
| GPT-Realtime-2 mini 音訊輸出 | 0.024 美元 / 分鐘 |
| 每分鐘合計 | 約 0.03 美元 |
| 每天 30 分鐘 | 約 0.9 美元 |
| 每月 | 約 27 美元 |
| Qwen 後處理 | 0（本地） |

---

## 十、環境變數

\\\env
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime-mini
\\\

---

## 十一、架構決策記錄（ADR）

### ADR-01：WS 終結點選方案 A（前端持 WS）

**決策**：前端直連 OpenAI Realtime WS，後端提供 HTTP 工具 API。
**理由**：Phase 2 核心是接 DB，App Router 天然適合 HTTP route；tool call 是離散請求，sub-ms SQLite 延遲可接受；不提前引入 custom Node server。
**代價**：工具編排邏輯散在前端；transcript 靠增量 POST 補強；client secret 過瀏覽器（短命 token，可接受）。
**重評時機**：Phase 3 後，若 transcript 仍有問題再評估方案 B（後端 relay）。

### ADR-02：in-session 工具只讀，SM-2 真值統一由 Qwen 負責

**決策**：mark_word_practiced / log_mistake 不作為 SM-2 真值；寫入統一走 async pipeline。
**理由**：模型非決定性，可能漏呼叫或重複呼叫；雙重寫入是競態根源。
**真值**：Qwen 從完整 transcript 推導，單一 transaction 寫入，冪等可重試。

### ADR-03：Transcript 增量落地，拆 transcript_items 表

**決策**：不存整包 blob；transcript_items 表每 10 秒 debounce append。
**理由**：前端累積一次 POST，瀏覽器崩潰會全丟；增量寫入最多丟 10 秒。

### ADR-04：Embedding 用 CPU fastembed，不搶 Qwen VRAM

**決策**：session_summary 向量化用 CPU bge-small，不用 Ollama GPU embedding。
**理由**：Qwen2.5-14B Q3_K_M 佔約 6.5GB VRAM，8GB 4060 同時跑 GPU embedding 會 OOM；embedding 是 async，CPU 速度夠用。

---

*規格書持續更新，以實際開發為準。*
