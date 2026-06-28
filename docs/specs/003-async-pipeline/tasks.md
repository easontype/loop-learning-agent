# Tasks 003 — Async Pipeline（Phase 3）

> 狀態：✅ 實作完成 | 完成日：2026-06-28

---

## Qwen Worker

- [x] 安裝 Ollama + 拉 `qwen2.5:14b-instruct-q3_K_M`（確認 VRAM 夠）
- [x] 建 `lib/worker.ts`：jobs queue consumer（setInterval 輪詢，序列化）
- [x] Qwen prompt 組裝（transcript + 指令）
- [x] POST `http://localhost:11434/api/generate`，stream=false
- [x] 解析 JSON 輸出
- [x] Schema 驗證（word 必須在 transcript，quality 0-5）
- [x] transaction 寫入：`sm2()` → `word_progress`，`mistakes`，`session_words`
- [x] 更新 `jobs.status = 'done'`
- [x] 失敗重試（attempts < 3），超過進 `status = 'dead'`

## LanceDB + Embedding

- [x] 安裝 `@lancedb/lancedb`（LanceDB Node binding）+ `@xenova/transformers`（bge-small CPU）
- [x] 建 `lib/lance.ts`：connect、create table、upsert、search
- [x] 首次執行時自動建 `db/lance/` 目錄 + memories table
- [x] session_summary → bge-small → Float32Array → LanceDB insert
- [x] recency_weight = `Math.exp(-daysSince / 90)`（90 天半衰期）

## RAG 注入

- [x] `app/api/session/route.ts`：query LanceDB 取 top-3 相關記憶
- [x] 格式化記憶 → 注入 system prompt 動態後綴
- [x] 確保固定前綴 / 動態後綴順序不變（Prompt Cache）

## 驗證（合成測試 2026-06-28）

- [x] Ollama JSON 解析：worker prompt → json 輸出 → validateQwenOutput 過濾
- [x] SM-2 transaction：word_progress 更新、session_words 寫入、jobs.status = 'done'
- [x] LanceDB：insertMemory（bge-small embedding）+ searchMemories（toArray）
- [ ] 真實 session 端對端（需先 `ollama pull qwen2.5:14b-instruct-q3_K_M`）
