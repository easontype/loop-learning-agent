# Spec 003 — Async Pipeline（Gemini + LanceDB + RAG）

> Phase 3 ✅ 完成（2026-07-01）

---

## 功能範圍

Session 結束後，Gemini 3.1 Flash-Lite 從 transcript 推導學習品質，寫入 SM-2，並將 session_summary 向量化存入 LanceDB 供 RAG 使用。

---

## 整體流程

```
POST /api/session/end
  → sessions.ended_at 寫入
  → jobs 插入 (type='post_session_analysis', status='pending')

Worker loop（lib/worker.ts，單一 consumer，序列化）
  → 讀 transcript_items WHERE session_id = :id ORDER BY seq
  → 組 prompt → Gemini 3.1 Flash-Lite（REST API，responseMimeType: application/json）
  → 解析 JSON 輸出（含 schema 驗證）
  → transaction：
      SM-2 更新 word_progress（sm2()）
      插入 mistakes
      插入 session_words
  → session_summary → fastembed → LanceDB
  → jobs.status = 'done'

失敗：attempts++ 最多重試 3 次，超過進 dead-letter（status='dead'）
```

---

## 分析輸出格式

```json
{
  "word_quality": {
    "ephemeral": 3,
    "ubiquitous": 4
  },
  "mistakes": [
    {
      "type": "grammar",
      "context": "I go yesterday",
      "correction": "I went yesterday"
    }
  ],
  "session_summary": "練習了過去式動詞，ephemeral 不熟，整體進步..."
}
```

---

## 分析 Prompt 設計

```
You are a language learning analyzer. Given the conversation transcript below,
extract vocabulary quality scores and grammar mistakes.

Rules:
- word_quality keys MUST appear in the transcript
- quality values are 0-5 (0=completely wrong, 3=acceptable, 5=perfect)
- Only include words that were actively used (not just mentioned by AI)
- session_summary must be in the user's native language

Transcript:
<transcript>
...
</transcript>

Respond ONLY with valid JSON matching the schema above.
```

---

## Schema 驗證規則

| 驗證項目 | 規則 | 失敗行為 |
|---------|------|---------|
| word_quality 鍵 | 必須出現在 transcript | 移除該詞，不中止 |
| quality 值 | 0-5 整數 | 夾到邊界（0 或 5） |
| JSON 格式 | 必須可 parse | 重試，最多 3 次 |
| 整體 schema | 必填欄位存在 | jobs.status = 'failed' |

---

## LanceDB + RAG

### 儲存

```typescript
// lib/lance.ts
interface MemoryRecord {
  session_id: number
  summary: string        // 原始文字
  vector: Float32Array   // bge-small 384 維
  language: string
  created_at: number
  recency_weight: number // e^(-days/90)，90 天半衰期
}
```

### 查詢（注入 system prompt）

```typescript
const memories = await lanceTable.search(queryVector)
  .limit(3)
  .where(`language = '${language}'`)
  .toArray()
```

最多注入 3 條，格式：
```
[過去學習記憶]
- 2026-06-20：練習過去式，went/went 混淆較多
- 2026-06-25：ephemeral 在 session 中 3 次均正確使用
```

---

## Gemini API 設定

```
GEMINI_API_KEY=...   # .env.local
```

Model：`gemini-3.1-flash-lite`
API：`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=$GEMINI_API_KEY`（POST，`generationConfig.responseMimeType: "application/json"`）

---

## 成功標準

- [x] Session 結束 30 秒內，jobs.status 變 'done'
- [x] word_progress 更新可在 DB 查到（next_review 改變）
- [ ] 第二次 session 的 system prompt 包含上次 summary
- [ ] Dashboard 可看到學習統計（見 spec 004）
