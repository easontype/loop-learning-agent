# ADR-02：in-session 工具只讀，SM-2 真值統一由 Qwen 負責

| 欄位 | 值 |
|------|-----|
| 日期 | 2026-06-20 |
| 狀態 | 已採用 |

## 決策

`get_next_word`、`get_word_definition` 兩個 in-session tool 只讀 DB，不寫入。
`word_progress` 的 SM-2 更新、`mistakes` 記錄，統一由 Qwen async worker 在 session 結束後寫入。

## 理由

- GPT-Realtime-2 是非決定性模型，tool call 可能漏呼或重複呼叫
- 雙重寫入（in-session + async）是競態根源，難以保證冪等
- Qwen 從完整 transcript 推導，有完整語境，品質評估更準確
- 單一寫入點 + transaction = 可重試，壞資料不入庫

## 代價

- `mark_word_practiced`、`log_mistake` 已降級，不作為 SM-2 真值
- session 進行中不能即時看到「這個詞已練習」的狀態
- 需要 Qwen worker 穩定跑（Phase 3）

## 廢棄的替代方案

- in-session 同步寫入：競態風險，模型 non-deterministic 下不可靠
