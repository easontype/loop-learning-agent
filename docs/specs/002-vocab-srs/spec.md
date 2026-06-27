# Spec 002 — 單字庫 + SM-2 + Tool Calling

> Phase 2 ✅ 完成 2026-06-27

---

## 功能範圍

SQLite 詞庫 + SM-2 間隔複習算法 + in-session tool call（只讀）+ transcript 增量落地。

---

## SRS 熱查詢

```sql
SELECT w.word, w.reading, w.definition, w.example
FROM word_progress wp JOIN words w ON w.id = wp.word_id
WHERE wp.next_review <= unixepoch()
  AND w.language = :language
ORDER BY wp.next_review ASC, wp.ease_factor ASC
LIMIT 8
```

必須有 `idx_word_progress_review ON word_progress(next_review, ease_factor)` 索引。

---

## SM-2 算法（lib/srs.ts）

| quality | 行為 |
|---------|------|
| 0-2 | lapse：interval=1, repetitions=0, lapses++ |
| 3-5 | 正常：interval 按 1→6→×ease_factor 增長 |

ease_factor 上限 / 下限：max 不限 / min 1.3。

---

## Tool Calling

遵守 ADR-02：只讀，不寫 DB。

| Tool | 參數 | 回傳 |
|------|------|------|
| `get_next_word(language)` | `"en"` 或 `"ja"` | `{ word, reading, definition, example, level }` |
| `get_word_definition(word, language)` | 詞 + 語言 | SQLite 查找，fallback Free Dictionary API（英文） |

觸發流程：`response.output_item.done` 事件 → 前端 POST `/api/tools` → 後端查 DB → 回前端 → 前端送 `conversation.item.create(function_call_output)` → 模型繼續語音。

---

## DB Schema（完整 7 張表）

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
PRAGMA foreign_keys = ON;

CREATE TABLE words (
  id INTEGER PRIMARY KEY, word TEXT NOT NULL, language TEXT NOT NULL,
  reading TEXT, definition TEXT NOT NULL, example TEXT, level TEXT, source TEXT,
  created_at INTEGER DEFAULT (unixepoch()), UNIQUE(word, language)
);

CREATE TABLE word_progress (
  id INTEGER PRIMARY KEY, word_id INTEGER REFERENCES words(id),
  ease_factor REAL DEFAULT 2.5, interval INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0, lapses INTEGER DEFAULT 0,
  last_quality INTEGER, last_reviewed INTEGER, next_review INTEGER,
  updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_word_progress_review ON word_progress(next_review, ease_factor);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY, language TEXT NOT NULL, persona TEXT NOT NULL,
  started_at INTEGER NOT NULL, ended_at INTEGER, duration_s INTEGER, processed INTEGER DEFAULT 0
);

CREATE TABLE transcript_items (
  id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id),
  role TEXT NOT NULL, text TEXT NOT NULL, seq INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(session_id, seq)
);
CREATE INDEX idx_transcript_session ON transcript_items(session_id, seq);

CREATE TABLE mistakes (
  id INTEGER PRIMARY KEY, session_id INTEGER REFERENCES sessions(id),
  word_id INTEGER, mistake_type TEXT, context TEXT, correction TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE session_words (
  session_id INTEGER REFERENCES sessions(id), word_id INTEGER REFERENCES words(id),
  practiced INTEGER DEFAULT 0, quality INTEGER, PRIMARY KEY (session_id, word_id)
);

CREATE TABLE jobs (
  id INTEGER PRIMARY KEY, type TEXT NOT NULL, session_id INTEGER REFERENCES sessions(id),
  status TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0, last_error TEXT,
  created_at INTEGER DEFAULT (unixepoch()), updated_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX idx_jobs_status ON jobs(status, created_at);
```

---

## 詞庫來源

| 來源 | 語言 | 入庫數量 | 取得方式 |
|------|------|---------|---------|
| JLPT N5-N2 | 日文 | 80 詞 | `scripts/import-jlpt.ts`（inline seed） |
| COCA B1-C1 | 英文 | 86 詞 | `scripts/import-coca.ts`（inline seed） |
| JLPT N1 完整詞表 | 日文 | 未匯入 | 替換 import script |
| COCA 60k | 英文 | 未匯入 | 下載 CSV 替換 |

詞庫現況：166 詞，`next_review = unixepoch()`（立即全部到期）。
