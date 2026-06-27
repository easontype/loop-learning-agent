# ADR-03：Transcript 增量落地，拆 transcript_items 表

| 欄位 | 值 |
|------|-----|
| 日期 | 2026-06-20 |
| 狀態 | 已採用 |

## 決策

不存整包 blob（例如 sessions.transcript TEXT）。
改用獨立 `transcript_items` 表，前端每 10 秒 debounce POST `/api/transcript/append` 增量寫入。

## flush 觸發點

- **用戶發言**：`input_audio_transcription.completed` 事件後立即排入 buffer
- **AI 發言**：`response.done` 事件後把累積的 AI delta 提交入 buffer
- **debounce**：10 秒無新內容後，buffer 中未落地的條目 POST 到後端

## 理由

- 前端累積一次 POST：瀏覽器崩潰或關 tab，整個 session transcript 全丟
- 增量寫入最多丟 10 秒，可接受（Qwen 重試時 transcript 基本完整）
- `UNIQUE(session_id, seq)` + `onConflictDoNothing()` 保冪等，重送安全

## 代價

- 前端要維護 `flushBufferRef`、`flushedCountRef`、`debounceTimerRef`
- partial AI streaming text 不能進 flush buffer（必須等 `response.done`）
