import { db } from './db'
import { sessions, words, word_progress, mistakes } from './schema'
import { eq, sum, count, gte, desc, asc } from 'drizzle-orm'

const WEEK_S = 7 * 86400
const LEECH_LAPSES = 4
const MASTERED_REPETITIONS = 3

export function getSummaryStats() {
  const now = Math.floor(Date.now() / 1000)

  const [durationRow] = db
    .select({ total: sum(sessions.duration_s) })
    .from(sessions)
    .all()

  const [weekRow] = db
    .select({ n: count() })
    .from(sessions)
    .where(gte(sessions.started_at, now - WEEK_S))
    .all()

  const [vocabRow] = db.select({ n: count() }).from(word_progress).all()

  const [masteredRow] = db
    .select({ n: count() })
    .from(word_progress)
    .where(gte(word_progress.repetitions, MASTERED_REPETITIONS))
    .all()

  const vocabSize = vocabRow?.n ?? 0
  const masteredCount = masteredRow?.n ?? 0

  return {
    totalDurationS: Number(durationRow?.total ?? 0),
    sessionsThisWeek: weekRow?.n ?? 0,
    vocabSize,
    masteredCount,
    masteredRatio: vocabSize > 0 ? masteredCount / vocabSize : 0,
  }
}

export function getWordProgress(opts: { language: string; limit?: number }) {
  const { language, limit = 50 } = opts

  return db
    .select({
      word: words.word,
      level: words.level,
      repetitions: word_progress.repetitions,
      lapses: word_progress.lapses,
      next_review: word_progress.next_review,
      ease_factor: word_progress.ease_factor,
    })
    .from(word_progress)
    .innerJoin(words, eq(word_progress.word_id, words.id))
    .where(eq(words.language, language))
    .orderBy(asc(word_progress.next_review))
    .limit(limit)
    .all()
    .map((row) => ({ ...row, isLeech: (row.lapses ?? 0) >= LEECH_LAPSES }))
}

export function getMistakes(opts: { limit?: number } = {}) {
  const { limit = 20 } = opts

  return db
    .select({
      id: mistakes.id,
      created_at: mistakes.created_at,
      mistake_type: mistakes.mistake_type,
      context: mistakes.context,
      correction: mistakes.correction,
    })
    .from(mistakes)
    .orderBy(desc(mistakes.created_at))
    .limit(limit)
    .all()
}
