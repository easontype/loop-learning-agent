# ADR-01：WS 終結點 — 前端持 WS（方案 A）

| 欄位 | 值 |
|------|-----|
| 日期 | 2026-06-20 |
| 狀態 | 已採用 |
| 重評時機 | Phase 3 完成後，若 transcript 仍有問題 |

## 決策

前端直連 `wss://api.openai.com/v1/realtime`（OpenAI Realtime WebSocket）。
後端（Next.js App Router）只提供 HTTP 工具 API，不做 WS relay。

## 方案比較

| | 方案 A（採用） | 方案 B（棄用） |
|-|--------------|--------------|
| WS 持有者 | 前端瀏覽器 | 後端 Node server |
| 工具呼叫 | 前端攔截 → POST /api/tools | 後端直接處理 |
| Transcript | 前端增量 POST /api/transcript/append | 後端攔截 |
| 延遲 | 較低（少一跳） | 較高 |
| App Router 相容性 | 高（HTTP only） | 需自訂 Node server |

## 理由

- Phase 2 核心是接 DB，App Router 天然適合 HTTP route
- tool call 是離散請求，sub-ms SQLite 延遲可接受
- 不提前引入自訂 Node server，避免 Vercel / Electron 部署複雜度

## 代價

- 工具編排邏輯散在前端（`ConversationView.tsx`）
- transcript 靠前端 debounce POST 補強（ADR-03）
- client secret 過瀏覽器（短命 token，OpenAI 官方支援的用法）
