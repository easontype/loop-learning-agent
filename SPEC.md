# Lingua A8 — 文件導覽

> 版本：1.0 | 2026-06-27
> 這是導覽索引，各層文件獨立存放。

---

## 文件地圖

| 文件 | 內容 | 受眾 |
|------|------|------|
| [`CLAUDE.md`](./CLAUDE.md) | Dev 命令、禁止事項、架構快參 | AI 每次 session 必讀 |
| [`PRD.md`](./PRD.md) | 產品定位、差異點、技術棧、成本 | 了解「為什麼做」 |
| [`docs/adr/`](./docs/adr/) | 架構決策記錄（ADR-01~04） | 技術決策查閱 |
| [`docs/specs/`](./docs/specs/) | 各 Phase 功能規格 + 任務清單 | 實作參考 |

---

## Phase 進度

| Phase | 功能 | 狀態 | Spec | Tasks |
|-------|------|------|------|-------|
| 1 | 全雙工對話引擎 | ✅ 完成 | [spec](./docs/specs/001-realtime-core/spec.md) | [tasks](./docs/specs/001-realtime-core/tasks.md) |
| 2 | 單字庫 + SM-2 + Tool Calling | ✅ 完成 | [spec](./docs/specs/002-vocab-srs/spec.md) | [tasks](./docs/specs/002-vocab-srs/tasks.md) |
| 3 | Gemini async + LanceDB + RAG | ✅ 完成 | [spec](./docs/specs/003-async-pipeline/spec.md) | [tasks](./docs/specs/003-async-pipeline/tasks.md) |
| 4 | Dashboard + 學習統計 | ✅ 完成 | [spec](./docs/specs/004-dashboard/spec.md) | [tasks](./docs/specs/004-dashboard/tasks.md) |

---

## 架構決策（ADR）

| ADR | 決策 | 狀態 |
|-----|------|------|
| [ADR-01](./docs/adr/ADR-01-ws-endpoint.md) | 前端持 WS，後端 HTTP 工具 API | 已採用 |
| [ADR-02](./docs/adr/ADR-02-in-session-readonly.md) | in-session 工具只讀，async worker 統一寫入 | 已採用 |
| [ADR-03](./docs/adr/ADR-03-transcript-incremental.md) | Transcript 增量落地，10s debounce | 已採用 |
| [ADR-04](./docs/adr/ADR-04-cpu-embedding.md) | Embedding 用 CPU fastembed | 已採用 |
