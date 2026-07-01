@AGENTS.md

# Lingua A8 — 專案規則（AI 必讀）

---

## Dev 命令

```bash
pnpm dev                 # 啟動開發伺服器（Port 3000）
pnpm db:import-all       # 匯入種子詞庫（= import-jlpt + import-coca）
pnpm db:import-jlpt      # JLPT N5-N2，80 詞
pnpm db:import-coca      # COCA B1-C1，86 詞
```

## 關鍵路徑

| 項目 | 路徑 |
|------|------|
| SQLite DB | `db/lingua.db` |
| Drizzle schema | `lib/schema.ts` |
| SM-2 算法 | `lib/srs.ts` |
| Session API | `app/api/session/route.ts` |
| Tool Handler | `app/api/tools/route.ts` |
| Transcript flush | `app/api/transcript/append/route.ts` |
| 前端對話元件 | `components/ConversationView.tsx` |

## .env 變數

```
OPENAI_API_KEY=sk-...
OPENAI_REALTIME_MODEL=gpt-realtime-mini
GEMINI_API_KEY=...
```

## 架構快參（詳見 docs/adr/）

- **ADR-01**：前端直連 OpenAI Realtime WS，後端只做 HTTP 工具 API
- **ADR-02**：in-session 工具只讀，SM-2 寫入統一由 async worker（Gemini）負責
- **ADR-03**：transcript 每 10 秒 debounce 增量寫入，不存 blob
- **ADR-04**：Embedding 走 CPU fastembed

## 絕對禁止

- `taskkill /IM node.exe` — 會殺掉 Claude Code 本身
- 在 pnpm workspace 根目錄跑 `npm rebuild better-sqlite3` — 需進入 `.pnpm/better-sqlite3@.../node_modules/better-sqlite3/` 後執行 `npx node-gyp rebuild`
- in-session tool call 裡寫 DB — 只讀，寫入邏輯在 async worker（`lib/worker.ts`）
- 修改 system prompt 固定前綴順序 — 影響 Prompt Cache 命中率

## 當前進度

| Phase | 狀態 | 文件 |
|-------|------|------|
| Phase 1 全雙工對話 | ✅ | `docs/specs/001-realtime-core/` |
| Phase 2 單字庫 + SM-2 | ✅ | `docs/specs/002-vocab-srs/` |
| Phase 3 Gemini async + LanceDB | ✅ | `docs/specs/003-async-pipeline/tasks.md` |
| Phase 4 Dashboard | ⬜ | `docs/specs/004-dashboard/` |
