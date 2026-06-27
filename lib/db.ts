import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import path from 'path'
import fs from 'fs'

const DB_DIR = path.join(process.cwd(), 'db')
const DB_PATH = path.join(DB_DIR, 'lingua.db')

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('busy_timeout = 5000')
sqlite.pragma('foreign_keys = ON')

sqlite.exec(`
CREATE TABLE IF NOT EXISTS words (
  id          INTEGER PRIMARY KEY,
  word        TEXT NOT NULL,
  language    TEXT NOT NULL,
  reading     TEXT,
  definition  TEXT NOT NULL,
  example     TEXT,
  level       TEXT,
  source      TEXT,
  created_at  INTEGER DEFAULT (unixepoch()),
  UNIQUE(word, language)
);

CREATE TABLE IF NOT EXISTS word_progress (
  id           INTEGER PRIMARY KEY,
  word_id      INTEGER REFERENCES words(id),
  ease_factor  REAL DEFAULT 2.5,
  interval     INTEGER DEFAULT 1,
  repetitions  INTEGER DEFAULT 0,
  lapses       INTEGER DEFAULT 0,
  last_quality INTEGER,
  last_reviewed INTEGER,
  next_review  INTEGER,
  updated_at   INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_word_progress_review ON word_progress(next_review, ease_factor);

CREATE TABLE IF NOT EXISTS sessions (
  id          INTEGER PRIMARY KEY,
  language    TEXT NOT NULL,
  persona     TEXT NOT NULL,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER,
  duration_s  INTEGER,
  processed   INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS transcript_items (
  id         INTEGER PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id),
  role       TEXT NOT NULL,
  text       TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(session_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_transcript_session ON transcript_items(session_id, seq);

CREATE TABLE IF NOT EXISTS mistakes (
  id           INTEGER PRIMARY KEY,
  session_id   INTEGER REFERENCES sessions(id),
  word_id      INTEGER,
  mistake_type TEXT,
  context      TEXT,
  correction   TEXT,
  created_at   INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS session_words (
  session_id  INTEGER REFERENCES sessions(id),
  word_id     INTEGER REFERENCES words(id),
  practiced   INTEGER DEFAULT 0,
  quality     INTEGER,
  PRIMARY KEY (session_id, word_id)
);

CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY,
  type        TEXT NOT NULL,
  session_id  INTEGER REFERENCES sessions(id),
  status      TEXT DEFAULT 'pending',
  attempts    INTEGER DEFAULT 0,
  last_error  TEXT,
  created_at  INTEGER DEFAULT (unixepoch()),
  updated_at  INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }
