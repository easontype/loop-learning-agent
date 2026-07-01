import { getSummaryStats, getWordProgress, getMistakes, getWeeklyTrend } from '@/lib/stats'

export const dynamic = 'force-dynamic'

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0 分鐘'
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes} 分鐘`
  return `${hours} 小時 ${minutes} 分鐘`
}

function formatDate(unixSeconds: number | null): string {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10)
}

const MISTAKE_TYPE_LABEL: Record<string, string> = {
  grammar: '文法',
  pronunciation: '發音',
  vocabulary: '詞彙',
}

function formatWeekLabel(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function EaseFactorChart({ rows }: { rows: ReturnType<typeof getWeeklyTrend> }) {
  const width = 320
  const height = 96
  const padX = 8
  const padY = 12
  const values = rows.map((r) => r.avgEaseFactor)
  const known = values.filter((v): v is number => v !== null)

  if (known.length < 2) {
    return <p className="text-[13px] text-[var(--loop-ink-mute)] px-1">資料不足，尚無法繪製趨勢</p>
  }

  const min = Math.min(...known)
  const max = Math.max(...known)
  const range = max - min || 1
  const stepX = (width - padX * 2) / (rows.length - 1)

  const points = rows
    .map((r, i) => {
      if (r.avgEaseFactor === null) return null
      const x = padX + i * stepX
      const y = padY + (1 - (r.avgEaseFactor - min) / range) * (height - padY * 2)
      return `${x},${y}`
    })
    .filter((p): p is string => p !== null)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      <polyline points={points} fill="none" stroke="var(--loop-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {rows.map((r, i) => {
        if (r.avgEaseFactor === null) return null
        const x = padX + i * stepX
        const y = padY + (1 - (r.avgEaseFactor - min) / range) * (height - padY * 2)
        return <circle key={i} cx={x} cy={y} r={2.5} fill="var(--loop-primary)" />
      })}
    </svg>
  )
}

function VocabGrowthChart({ rows }: { rows: ReturnType<typeof getWeeklyTrend> }) {
  const width = 320
  const height = 96
  const padX = 8
  const barGap = 4
  const barWidth = (width - padX * 2) / rows.length - barGap
  const maxNew = Math.max(...rows.map((r) => r.newWords), 1)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
      {rows.map((r, i) => {
        const barHeight = (r.newWords / maxNew) * (height - 16)
        const x = padX + i * (barWidth + barGap)
        const y = height - barHeight
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={Math.max(barHeight, r.newWords > 0 ? 2 : 0)}
            fill="var(--loop-primary-subdued)"
            rx={1}
          />
        )
      })}
    </svg>
  )
}

function OverviewCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--loop-canvas)] border border-[var(--loop-hairline)] rounded-[6px] p-6">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--loop-ink-mute)] mb-2">{label}</p>
      <p className="text-[22px] font-light tracking-[-0.22px] text-[var(--loop-ink)] tabular-nums">{value}</p>
      {sub && <p className="text-[13px] text-[var(--loop-ink-mute)] mt-1">{sub}</p>}
    </div>
  )
}

function WordProgressTable({ language, rows }: { language: string; rows: ReturnType<typeof getWordProgress> }) {
  return (
    <div className="bg-[var(--loop-canvas)] border border-[var(--loop-hairline)] rounded-[6px] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--loop-hairline)]">
        <h3 className="text-[15px] font-normal text-[var(--loop-ink)]">{language === 'en' ? 'English' : '日本語'}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-[var(--loop-ink-mute)]">尚無資料</p>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--loop-ink-mute)]">
              <th className="px-5 py-2 font-medium">單字</th>
              <th className="px-5 py-2 font-medium">程度</th>
              <th className="px-5 py-2 font-medium text-right">複習次數</th>
              <th className="px-5 py-2 font-medium text-right">Ease</th>
              <th className="px-5 py-2 font-medium text-right">下次複習</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`border-t border-[var(--loop-hairline)] ${row.isLeech ? 'bg-[var(--loop-ruby)]/5' : ''}`}
              >
                <td className="px-5 py-2.5 text-[var(--loop-ink)]">
                  {row.word}
                  {row.isLeech && (
                    <span className="ml-2 inline-block rounded-[2px] bg-[var(--loop-ruby)]/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--loop-ruby)] align-middle">
                      Leech
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-[var(--loop-ink-mute)]">{row.level ?? '—'}</td>
                <td className="px-5 py-2.5 text-right text-[var(--loop-ink)] tabular-nums">{row.repetitions}</td>
                <td className="px-5 py-2.5 text-right text-[var(--loop-ink)] tabular-nums">{row.ease_factor?.toFixed(2)}</td>
                <td className="px-5 py-2.5 text-right text-[var(--loop-ink-mute)] tabular-nums">{formatDate(row.next_review)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const stats = getSummaryStats()
  const enWords = getWordProgress({ language: 'en' })
  const jaWords = getWordProgress({ language: 'ja' })
  const mistakes = getMistakes({ limit: 20 })
  const trend = getWeeklyTrend()

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-[26px] font-light tracking-[-0.26px] text-[var(--loop-ink)] mb-8">學習儀表板</h1>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <OverviewCard label="總練習時長" value={formatDuration(stats.totalDurationS)} />
        <OverviewCard label="本週練習次數" value={`${stats.sessionsThisWeek} 次`} />
        <OverviewCard
          label="詞庫大小"
          value={`${stats.vocabSize} 個`}
          sub={`已熟練 ${Math.round(stats.masteredRatio * 100)}%（${stats.masteredCount} 個）`}
        />
      </section>

      <section className="mb-10">
        <h2 className="text-[19px] font-light tracking-[-0.19px] text-[var(--loop-ink)] mb-4">單字進度</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WordProgressTable language="en" rows={enWords} />
          <WordProgressTable language="ja" rows={jaWords} />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[19px] font-light tracking-[-0.19px] text-[var(--loop-ink)] mb-4">學習曲線</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[var(--loop-canvas)] border border-[var(--loop-hairline)] rounded-[6px] p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--loop-ink-mute)] mb-3">每週平均 Ease Factor</p>
            <EaseFactorChart rows={trend} />
            <div className="flex justify-between text-[10px] text-[var(--loop-ink-mute)] mt-1">
              <span>{formatWeekLabel(trend[0].weekStart)}</span>
              <span>{formatWeekLabel(trend[trend.length - 1].weekStart)}</span>
            </div>
          </div>
          <div className="bg-[var(--loop-canvas)] border border-[var(--loop-hairline)] rounded-[6px] p-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--loop-ink-mute)] mb-3">每週新增詞彙</p>
            <VocabGrowthChart rows={trend} />
            <div className="flex justify-between text-[10px] text-[var(--loop-ink-mute)] mt-1">
              <span>{formatWeekLabel(trend[0].weekStart)}</span>
              <span>{formatWeekLabel(trend[trend.length - 1].weekStart)}</span>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[19px] font-light tracking-[-0.19px] text-[var(--loop-ink)] mb-4">最近錯誤</h2>
        <div className="bg-[var(--loop-canvas)] border border-[var(--loop-hairline)] rounded-[6px] overflow-hidden">
          {mistakes.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-[var(--loop-ink-mute)]">尚無資料</p>
          ) : (
            <ul>
              {mistakes.map((m) => (
                <li key={m.id} className="px-5 py-3 border-t border-[var(--loop-hairline)] first:border-t-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-[var(--loop-ink-mute)] tabular-nums">{formatDate(m.created_at)}</span>
                    <span className="inline-block rounded-[2px] bg-[var(--loop-primary-subdued)]/40 px-1.5 py-0.5 text-[10px] font-medium text-[var(--loop-primary-deep)]">
                      {MISTAKE_TYPE_LABEL[m.mistake_type ?? ''] ?? m.mistake_type ?? '未分類'}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--loop-ink-mute)]">
                    <span className="line-through">{m.context}</span>
                    {m.correction && <span className="text-[var(--loop-ink)]"> → {m.correction}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}
