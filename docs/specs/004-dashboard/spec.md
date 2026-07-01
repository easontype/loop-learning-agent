# Spec 004 — Dashboard（學習統計）

> Phase 4 ✅ 完成（2026-07-01）

---

## 功能範圍

`/dashboard` 頁面，展示學習進度、單字狀態、錯誤清單。

---

## 頁面區塊

### 總覽卡片
- 總練習時長（`SUM(sessions.duration_s)`）
- 本週 session 次數
- 當前詞庫大小 + 已熟練比例（repetitions >= 3）

### 單字進度表
- 分語言（en / ja）顯示
- 欄位：word、level、repetitions、next_review、ease_factor
- 可按 next_review 排序（最快到期的優先）
- Leech 警示（lapses >= 4）

### 錯誤清單
- 從 `mistakes` 表讀取最近 20 條
- 欄位：日期、類型（grammar / pronunciation / vocabulary）、context、correction

### 學習曲線（Phase 4 後期）
- 每週平均 ease_factor 變化
- 詞彙新增 / 熟練數量趨勢

---

## API 設計

```
GET /api/words?language=en&sort=next_review&limit=50
GET /api/stats/summary
GET /api/mistakes?limit=20
```

---

## 設計系統

Phase 4 UI 使用 `/ds-full`（design-system skill 組）產生的 Loop 設計系統 — Path 0 命中 `VoltAgent/awesome-design-md` 的 Stripe 參考版，套用 conservative 變種（主色降飽和、圓角壓縮到 2–8px、按鈕改小圓角矩形取代原本的 pill 形狀、無陰影改用 hairline 邊框）。定義見專案根目錄 `DESIGN.md`。

## 成功標準

- [x] `/dashboard` 頁面可存取，不報錯
- [x] 至少一次 Phase 3 完整跑過後，看到有資料的進度表（166 個單字、20 筆錯誤紀錄皆正確顯示）
- [x] Leech 單字有明顯標示（lapses >= 4 時顯示 ruby 色底 + Leech 標籤；目前資料尚無實際 leech 詞可視覺驗證，邏輯已實作並可運作）
