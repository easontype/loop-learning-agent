# Tasks 003 — Async Pipeline（Phase 3）

> 狀態：✅ 實作完成 | 完成日：2026-07-01（真實 session 端對端驗證通過）

---

## Gemini Worker

- [x] 設定 `GEMINI_API_KEY`（`.env.local`）
- [x] 建 `lib/worker.ts`：jobs queue consumer（setInterval 輪詢，序列化）
- [x] Analysis prompt 組裝（transcript + 指令）
- [x] POST Gemini `generateContent`（`gemini-3.1-flash-lite`，`responseMimeType: application/json`）
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

- [x] Gemini JSON 解析：worker prompt → json 輸出 → validateAnalysisOutput 過濾
- [x] SM-2 transaction：word_progress 更新、session_words 寫入、jobs.status = 'done'
- [x] LanceDB：insertMemory（bge-small embedding）+ searchMemories（toArray）
- [x] 真實 session 端對端（使用者實際開口說話，transcript 含 user 台詞，Gemini worker 分析並寫入 word_progress/mistakes 成功）

## 修正記錄

- [x]（2026-07-01）**卡死 job 復原**：`processJob()` 一開始就把 job 標成 `processing`，若 server 在等 Gemini 回應時重啟/崩潰，該 job 會永遠卡在 `processing`（輪詢只抓 `status='pending'`）。修正：新增 `recoverStaleJobs()`，每次輪詢前檢查 `status='processing'` 且 `updated_at` 超過 300 秒（正常 Gemini 呼叫不可能這麼久）的 job，視 `attempts` 轉回 `pending` 重試或 `dead`。
- [x]（2026-07-01）**大小寫敏感導致靜默漏字**：`validateAnalysisOutput` 用 `transcriptText.includes(key)`、word_progress 寫入時用 `eq(words.word, word)`，兩處都是精確字串比對，Gemini 回傳大小寫跟 transcript/DB 不同時（例如句首大寫）該字會被直接跳過。修正：transcript 比對改用小寫正規化（`toLowerCase()`），DB 查找改用 `lower(word) = lower(?)`，並補上 `console.warn` 讓漏字不再無聲無息。
- [x]（2026-07-01）**quality 值無 NaN 防呆**：Gemini 若回傳非數字，`Number(x)` → `NaN`，`sm2()` 裡 `q >= 3` 對 NaN 恆為 false，會被靜默當成一次 lapse。修正：`validateAnalysisOutput` 改用 `Number.isFinite()` 檢查，無效值直接丟棄該筆 word_quality（而非帶著 NaN 進入 SM-2），並加上警告 log。
