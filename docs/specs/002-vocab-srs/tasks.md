# Tasks 002 — 單字庫 + SM-2 + Tool Calling（Phase 2）

> 狀態：✅ 全部完成（2026-06-27）

- [x] SQLite WAL + Drizzle schema（7 張表：words, word_progress, sessions, transcript_items, mistakes, session_words, jobs）
- [x] SM-2 算法（`lib/srs.ts`）
- [x] 匯入 JLPT N5-N2 種子詞表（80 詞，`scripts/import-jlpt.ts`）
- [x] 匯入 COCA 英文種子詞（86 詞，B1-C1，`scripts/import-coca.ts`）
- [x] SRS 查詢接入 `app/api/session/route.ts`（language filter + 到期排序）
- [x] Tool Handler（`app/api/tools/route.ts`，只讀：`get_next_word` / `get_word_definition`）
- [x] Tool Calling 前端攔截（`ConversationView.tsx`，`response.output_item.done` → POST /api/tools → `conversation.item.create`）
- [x] Transcript 增量落地（10s debounce，`response.done` 觸發 flush，`app/api/transcript/append/route.ts`）
- [x] `/api/session/end` + jobs 入隊
- [x] 成功標準達成：AI 對話中使用今日單字，逐字稿持久寫入 DB

## 修正記錄

- [x] （2026-07-01）**跨語言洩漏修復**：`get_next_word` 原本 tool schema 的 `parameters` 是空的、後端也完全沒有依 `words.language` 過濾，會在英文角色 session 中回傳日文單字（反之亦然）。修正：前端 `handleToolCall` 強制帶入 `persona.language`（不信任模型自行填寫），後端 `app/api/tools/route.ts` 依 `language` 過濾 + 補上回傳缺漏的 `level` 欄位（原本 spec 就要求但實作漏掉）。已用真實 dev server 驗證 en/ja 各自查詢皆正確，缺少 `language` 回 400。
- [x] （2026-07-01）**`/api/session/end` 防重複呼叫**：原本每次呼叫都無條件插入新 `jobs` 並更新 `sessions.ended_at`/`duration_s`。前端 `disconnect()` 是 fire-and-forget，若重複觸發（網路重試、UI 重複點擊、unmount + 手動掛斷同時發生）會讓同一 session 被分析兩次，SM-2 更新非幂等會套用兩次、`mistakes` 也會重複插入。修正：在寫入前檢查 `session.ended_at` 是否已存在，已結束就直接回傳 `{ ok: true, already_ended: true }`，不重複插入 job。（better-sqlite3 為同步呼叫，check 與 transaction 之間沒有 await 讓出事件迴圈，單一 Node process 內不會有競態。）
