# Spec 001 — 全雙工對話引擎

> Phase 1 ✅ 完成 2026-06-20

---

## 功能範圍

OpenAI GPT-Realtime-2 mini 全雙工語音對話，支援 barge-in（打斷），前端直連 WS。

## 連線規格

| 項目 | 值 |
|------|-----|
| WebSocket | `wss://api.openai.com/v1/realtime` |
| 音訊格式 | PCM 16-bit, 24kHz mono |
| VAD | 伺服器端 `semantic_vad` |
| Session 長度上限 | 60 分鐘 |
| client secret 取得 | POST `/api/session` |

## Barge-in 機制

用戶說話時：
1. 送 `conversation.item.truncate`（截斷 AI 目前發言）
2. 停止所有 `AudioBufferSource.stop()`（立即靜音）
3. 送用戶音訊繼續

## Persona 介面

```typescript
interface Persona {
  id: string
  name: string
  language: "en" | "ja"
  style: "casual" | "formal" | "teacher" | "friend"
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  correctionStyle: "gentle" | "strict" | "none"
  voice: RealtimeVoice
  description: string
}
```

目前 4 個預設角色：英文老師、日文朋友、外籍面試官、日文 N3 教練。

## System Prompt 結構

```
[固定前綴：角色、規則、語言指令]   ← Prompt Cache 命中這段
[動態後綴：今日單字 + 相關記憶]   ← 每次 session 不同
```

固定前綴必須排在動態後綴前，否則 Prompt Cache 失效，成本倍增。

## 音波視覺化

AudioWorklet 計算 RMS，前端 24-bar 顯示（`AudioVisualizer.tsx`）。
