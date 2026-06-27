# Tasks 003 — Async Pipeline（Phase 3）

> 狀態：⬜ 尚未開始 | 目標：3-4 天

---

## Qwen Worker

- [ ] 安裝 Ollama + 拉 `qwen2.5:14b-instruct-q3_K_M`（確認 VRAM 夠）
- [ ] 建 `lib/worker.ts`：jobs queue consumer（setInterval 輪詢，序列化）
- [ ] Qwen prompt 組裝（transcript + 指令）
- [ ] POST `http://localhost:11434/api/generate`，stream=false
- [ ] 解析 JSON 輸出
- [ ] Schema 驗證（word 必須在 transcript，quality 0-5）
- [ ] transaction 寫入：`sm2()` → `word_progress`，`mistakes`，`session_words`
- [ ] 更新 `jobs.status = 'done'`
- [ ] 失敗重試（attempts < 3），超過進 `status = 'dead'`

## LanceDB + Embedding

- [ ] 安裝 `vectordb`（LanceDB Node binding）+ `@xenova/transformers`（fastembed CPU）
- [ ] 建 `lib/lance.ts`：connect、create table、upsert、search
- [ ] 首次執行時自動建 `db/lance/` 目錄 + memories table
- [ ] session_summary → bge-small → Float32Array → LanceDB insert
- [ ] recency_weight = `Math.exp(-daysSince / 90)`（90 天半衰期）

## RAG 注入

- [ ] `app/api/session/route.ts`：query LanceDB 取 top-3 相關記憶
- [ ] 格式化記憶 → 注入 system prompt 動態後綴
- [ ] 確保固定前綴 / 動態後綴順序不變（Prompt Cache）

## 驗證

- [ ] 跑一次完整 session → 結束 → 30 秒內 jobs.status = 'done'
- [ ] 查 SQLite：`SELECT * FROM word_progress WHERE updated_at > unixepoch()-300`
- [ ] 開第二次 session → DevTools 看 POST /api/session response → system prompt 含記憶
