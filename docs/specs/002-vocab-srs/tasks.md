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
