# ADR-04：Embedding 用 CPU fastembed，不搶 Qwen VRAM

| 欄位 | 值 |
|------|-----|
| 日期 | 2026-06-20 |
| 狀態 | 已採用 |

## 決策

`session_summary` 向量化用 CPU `fastembed bge-small-en-v1.5`，不用 Ollama GPU embedding。

## 理由

- Qwen2.5-14B Q3_K_M 佔約 6.5 GB VRAM，RTX 4060 只有 8 GB
- 同時跑 GPU embedding 會 OOM，影響 Qwen 推論
- Embedding 是 async 任務，CPU 速度夠用（bge-small < 100ms/句）
- fastembed 可在 Node.js 內直接跑，不需要額外 server

## 代價

- CPU 跑 embedding，速度比 GPU 慢約 5-10x
- 需要額外安裝 `@xenova/transformers` 或 fastembed Node binding
- 首次跑時需要下載模型（約 120MB）

## 模型選擇

`BAAI/bge-small-en-v1.5`：
- 384 維度，體積小
- 對英文 + 日文混合文本品質尚可
- LanceDB 原生支援此格式
