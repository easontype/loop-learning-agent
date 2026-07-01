# ADR-04：Embedding 用 CPU fastembed

| 欄位 | 值 |
|------|-----|
| 日期 | 2026-06-20（2026-07-01 更新：分析模型改用 Gemini API，理由調整） |
| 狀態 | 已採用 |

## 決策

`session_summary` 向量化用 CPU `fastembed bge-small-en-v1.5`（`@xenova/transformers`）。

## 理由

- Embedding 是 async 任務，CPU 速度夠用（bge-small < 100ms/句）
- fastembed 可在 Node.js 內直接跑，不需要額外 server / GPU 依賴

> 原始理由（備查）：舊版分析模型是本地 Qwen2.5-14B（佔約 6.5GB VRAM），同時跑 GPU embedding 會 OOM。2026-07 起分析模型改用雲端 Gemini API，本地已無常駐 GPU 推理，VRAM 競爭問題不再存在；但 CPU embedding 本身仍是合理選擇（免額外 server），故決策維持不變。

## 代價

- CPU 跑 embedding，速度比 GPU 慢約 5-10x
- 需要額外安裝 `@xenova/transformers` 或 fastembed Node binding
- 首次跑時需要下載模型（約 120MB）

## 模型選擇

`BAAI/bge-small-en-v1.5`：
- 384 維度，體積小
- 對英文 + 日文混合文本品質尚可
- LanceDB 原生支援此格式
