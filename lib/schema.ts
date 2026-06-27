import { sqliteTable, integer, text, real, primaryKey, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const words = sqliteTable('words', {
  id: integer('id').primaryKey(),
  word: text('word').notNull(),
  language: text('language').notNull(),
  reading: text('reading'),
  definition: text('definition').notNull(),
  example: text('example'),
  level: text('level'),
  source: text('source'),
  created_at: integer('created_at').default(sql`(unixepoch())`),
}, (t) => [
  uniqueIndex('words_word_language_uniq').on(t.word, t.language),
])

export const word_progress = sqliteTable('word_progress', {
  id: integer('id').primaryKey(),
  word_id: integer('word_id').references(() => words.id),
  ease_factor: real('ease_factor').default(2.5),
  interval: integer('interval').default(1),
  repetitions: integer('repetitions').default(0),
  lapses: integer('lapses').default(0),
  last_quality: integer('last_quality'),
  last_reviewed: integer('last_reviewed'),
  next_review: integer('next_review'),
  updated_at: integer('updated_at').default(sql`(unixepoch())`),
}, (t) => [
  index('idx_word_progress_review').on(t.next_review, t.ease_factor),
])

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey(),
  language: text('language').notNull(),
  persona: text('persona').notNull(),
  started_at: integer('started_at').notNull(),
  ended_at: integer('ended_at'),
  duration_s: integer('duration_s'),
  processed: integer('processed').default(0),
})

export const transcript_items = sqliteTable('transcript_items', {
  id: integer('id').primaryKey(),
  session_id: integer('session_id').references(() => sessions.id),
  role: text('role').notNull(),
  text: text('text').notNull(),
  seq: integer('seq').notNull(),
  created_at: integer('created_at').default(sql`(unixepoch())`),
}, (t) => [
  index('idx_transcript_session').on(t.session_id, t.seq),
  uniqueIndex('idx_transcript_session_seq').on(t.session_id, t.seq),
])

export const mistakes = sqliteTable('mistakes', {
  id: integer('id').primaryKey(),
  session_id: integer('session_id').references(() => sessions.id),
  word_id: integer('word_id'),
  mistake_type: text('mistake_type'),
  context: text('context'),
  correction: text('correction'),
  created_at: integer('created_at').default(sql`(unixepoch())`),
})

export const session_words = sqliteTable('session_words', {
  session_id: integer('session_id').references(() => sessions.id),
  word_id: integer('word_id').references(() => words.id),
  practiced: integer('practiced').default(0),
  quality: integer('quality'),
}, (t) => [
  primaryKey({ columns: [t.session_id, t.word_id] }),
])

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey(),
  type: text('type').notNull(),
  session_id: integer('session_id').references(() => sessions.id),
  status: text('status').default('pending'),
  attempts: integer('attempts').default(0),
  last_error: text('last_error'),
  created_at: integer('created_at').default(sql`(unixepoch())`),
  updated_at: integer('updated_at').default(sql`(unixepoch())`),
}, (t) => [
  index('idx_jobs_status').on(t.status, t.created_at),
])
