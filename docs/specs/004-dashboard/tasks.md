# Tasks 004 — Dashboard（Phase 4）

> 狀態：⬜ 尚未開始（等 Phase 3 完成後開始）

---

## API

- [ ] `GET /api/words` — 列出詞庫（支援 language / sort / limit 參數）
- [ ] `GET /api/stats/summary` — 總覽統計（時長、session 次數、熟練率）
- [ ] `GET /api/mistakes` — 最近錯誤清單

## 前端

- [ ] `app/dashboard/page.tsx` — 主頁面
- [ ] `components/ProgressCard.tsx` — 總覽卡片
- [ ] `components/WordList.tsx` — 單字進度表（含 Leech 標示）
- [ ] 錯誤清單區塊

## 進階（後期）

- [ ] Leech 偵測（lapses >= 4，自動標示 + 建議降級複習）
- [ ] 學習曲線圖表（每週 ease_factor 平均）
- [ ] JMdict 完整日文詞典匯入
