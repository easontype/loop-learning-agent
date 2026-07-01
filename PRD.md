# Lingua A8 — Product Requirements Document

> 版本：1.0 | 2026-06-27
> 這份文件定義「為什麼做」。功能細節見 `docs/specs/`，架構決策見 `docs/adr/`。

---

## 產品定位

Lingua A8 是以 GPT-Realtime-2 為核心的全雙工語音對話語言教學系統。學習者可以像與真人對話一樣自然地練習英文或日文，隨時打斷、隨時回應，並搭配可動態更換的單字庫，系統自動記錄每次學習狀況。

### 核心差異點

| 差異 | 說明 |
|------|------|
| 全雙工 | 真正的即時對話，可打斷，不是 push-to-talk |
| 固定 token 開銷 | initial input token 固定 300-500，不隨使用時間增長 |
| 單字庫可插拔 | 依課程/考試目標更換詞彙組（JLPT、TOEIC、自定義） |
| SM-2 學習記錄 | 每個詞的接觸次數、品質、錯誤都有紀錄，自動安排複習 |
| 角色設定 | 可切換 AI 角色（日本朋友、外籍老師、面試官…） |

---

## 使用情境

### 當前階段（自用）
- 本地 Next.js 跑在 localhost:3000
- 單人使用，快速迭代功能
- 重點在對話品質與單字庫機制

### 未來階段（App）
- 包成 Electron 桌面應用，或 PWA 手機版
- 多用戶帳號 + 雲端同步

---

## 技術棧

| 層 | 技術 | 理由 |
|----|------|------|
| 框架 | Next.js 16（App Router） | 同一套可包 Electron / PWA |
| 語言 | TypeScript | 型別安全，長期維護 |
| 樣式 | Tailwind CSS v4 | 快速開發 |
| 即時通訊 | WebSocket（前端直連 OpenAI） | GPT-Realtime-2 必須（ADR-01） |
| 音訊 | Web Audio API + AudioWorklet | 瀏覽器原生，低延遲 |
| AI 核心 | OpenAI GPT-Realtime-2 mini | 全雙工，barge-in，成本低 |
| 向量庫 | LanceDB（embedded） | 無需 server，TS + Python 共用 |
| 分析模型 | Gemini 3.1 Flash-Lite（雲端 API） | async 後處理，低延遲低成本，不佔本地資源 |
| Embedding | fastembed bge-small（CPU） | 免額外 server，跨機器一致（ADR-04） |
| 資料庫 | SQLite + WAL（better-sqlite3） | 自用期輕量 |
| ORM | Drizzle ORM | 輕量，型別安全 |
| 套件管理 | pnpm | 快，磁碟效率好 |

---

## 成本估算

| 項目 | 費用 |
|------|------|
| GPT-Realtime-2 mini 音訊輸入 | $0.006 / 分鐘 |
| GPT-Realtime-2 mini 音訊輸出 | $0.024 / 分鐘 |
| 每分鐘合計 | 約 $0.03 |
| 每天 30 分鐘 | 約 $0.9 |
| 每月 | 約 $27 |
| Gemini 3.1 Flash-Lite 後處理 | 約 $0.03 / 月（30 分鐘/天，token 量極小） |

---

## 成功指標

- 每次 session AI 能自然帶入本次到期的單字
- Session 結束後，transcript 完整寫入 DB（不丟失）
- 第二次 session 能感受到記憶注入（RAG 生效，Phase 3 後）
- 每月 API 成本控制在 $30 以內（30 分鐘/天）
