# Tasks 004 — Dashboard（Phase 4）

> 狀態：✅ 實作完成 | 完成日：2026-07-01

---

## API

- [x] `GET /api/words` — 列出詞庫（支援 language / limit 參數；sort 固定 next_review 由 spec 只定義這一種排序）
- [x] `GET /api/stats/summary` — 總覽統計（時長、本週 session 次數、詞庫大小、熟練率）
- [x] `GET /api/mistakes` — 最近錯誤清單（支援 limit 參數）

## 前端

- [x] `app/dashboard/page.tsx` — 主頁面（含總覽卡片、單字進度表、錯誤清單，皆為頁面內的小型元件，未拆成獨立檔案 —
      單頁單次使用、無跨頁複用需求，拆檔案是不必要的抽象）
- [x] `app/dashboard/layout.tsx` — 套用 Inter 字型（DESIGN.md 建議的 Sohne 替代字型）
- [x] `lib/stats.ts` — 統計查詢層（getSummaryStats / getWordProgress / getMistakes），供 API route 與 page.tsx 共用
- [x] 錯誤清單區塊

## 進階（後期，未做）

- [x] Leech 偵測（lapses >= 4，自動標示 + ruby 色底提示）— 已隨主頁面一併完成，非後期項目
- [ ] 學習曲線圖表（每週 ease_factor 平均）
- [ ] JMdict 完整日文詞典匯入

## 設計系統踩雷紀錄

- Tailwind v4 的 `@theme inline { --color-loop-ink: var(--loop-ink); }` 這種自訂 namespace token **沒有**如預期生成 `text-loop-ink` 等 utility class（實測 `rounded-loop-lg` 算出來是 `0px`，`text-loop-ink` 會 fallback 到繼承色，完全沒套用）。改用 bracket arbitrary value 直接引用 CSS 變數（如 `text-[var(--loop-ink)]`、`rounded-[6px]`）才正確生效。`--loop-*` 變數本身仍留在 `:root`，只是不透過 `@theme` 生成 utility。
