import { db } from './db'
import { jobs, sessions, transcript_items, word_progress, words, mistakes, session_words } from './schema'
import { sm2, defaultSM2 } from './srs'
import { insertMemory } from './lance'
import { eq, and, asc, sql } from 'drizzle-orm'

const OLLAMA_URL = 'http://localhost:11434/api/generate'
const MODEL = 'qwen2.5:14b-instruct-q3_K_M'

export function startWorker() {
  setInterval(processPendingJobs, 30_000)
}

async function processPendingJobs() {
  const pending = db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, 'pending'), eq(jobs.type, 'post_session_analysis')))
    .orderBy(asc(jobs.created_at))
    .limit(1)
    .all()

  for (const job of pending) {
    await processJob(job.id, job.session_id!)
  }
}

async function processJob(jobId: number, sessionId: number) {
  db.update(jobs)
    .set({ status: 'processing', attempts: sql`attempts + 1`, updated_at: sql`unixepoch()` })
    .where(eq(jobs.id, jobId))
    .run()

  try {
    const items = db
      .select()
      .from(transcript_items)
      .where(eq(transcript_items.session_id, sessionId))
      .orderBy(asc(transcript_items.seq))
      .all()

    if (items.length === 0) {
      db.update(jobs).set({ status: 'done', updated_at: sql`unixepoch()` }).where(eq(jobs.id, jobId)).run()
      return
    }

    const transcriptText = items.map((i) => `${i.role}: ${i.text}`).join('\n')

    const prompt = buildQwenPrompt(transcriptText)
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, stream: false, format: 'json' }),
    })
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`)

    const ollamaData = await res.json()
    const parsed = JSON.parse(ollamaData.response)
    const validated = validateQwenOutput(parsed, transcriptText)

    const session = db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1).all()[0]
    const now = Math.floor(Date.now() / 1000)

    db.transaction((tx) => {
      for (const [word, quality] of Object.entries(validated.word_quality as Record<string, number>)) {
        const wordRow = tx
          .select({ id: words.id })
          .from(words)
          .where(eq(words.word, word))
          .limit(1)
          .all()[0]
        if (!wordRow) continue

        const existing = tx
          .select()
          .from(word_progress)
          .where(eq(word_progress.word_id, wordRow.id))
          .limit(1)
          .all()[0]

        const state = existing
          ? {
              ease_factor: existing.ease_factor!,
              interval: existing.interval!,
              repetitions: existing.repetitions!,
              lapses: existing.lapses!,
            }
          : defaultSM2()

        const result = sm2(state, quality)

        if (existing) {
          tx.update(word_progress)
            .set({ ...result, updated_at: now })
            .where(eq(word_progress.word_id, wordRow.id))
            .run()
        } else {
          tx.insert(word_progress).values({ word_id: wordRow.id, ...result, updated_at: now }).run()
        }

        tx.insert(session_words)
          .values({ session_id: sessionId, word_id: wordRow.id, practiced: 1, quality })
          .onConflictDoNothing()
          .run()
      }

      for (const m of (validated.mistakes as Array<{ type: string; context: string; correction: string }>) ?? []) {
        tx.insert(mistakes).values({
          session_id: sessionId,
          mistake_type: m.type,
          context: m.context,
          correction: m.correction,
        }).run()
      }
    })

    if (validated.session_summary && session) {
      await insertMemory({
        session_id: sessionId,
        summary: validated.session_summary as string,
        language: session.language,
        created_at: now,
      })
    }

    db.update(jobs).set({ status: 'done', updated_at: sql`unixepoch()` }).where(eq(jobs.id, jobId)).run()
    console.log(`[worker] job ${jobId} done`)
  } catch (err) {
    const job = db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1).all()[0]
    const nextStatus = (job?.attempts ?? 1) >= 3 ? 'dead' : 'pending'
    db.update(jobs)
      .set({ status: nextStatus, last_error: String(err), updated_at: sql`unixepoch()` })
      .where(eq(jobs.id, jobId))
      .run()
    console.error(`[worker] job ${jobId} ${nextStatus}:`, err)
  }
}

function buildQwenPrompt(transcript: string): string {
  return `You are a language learning analyzer. Given the conversation transcript below, extract vocabulary quality scores and grammar mistakes.

Rules:
- word_quality keys MUST appear in the transcript
- quality values are 0-5 (0=completely wrong, 3=acceptable, 5=perfect)
- Only include words the user actively used (not just mentioned by AI)
- session_summary must be in Traditional Chinese

Transcript:
<transcript>
${transcript}
</transcript>

Respond ONLY with valid JSON:
{"word_quality":{"word":3},"mistakes":[{"type":"grammar","context":"...","correction":"..."}],"session_summary":"..."}`
}

function validateQwenOutput(parsed: unknown, transcriptText: string): Record<string, unknown> {
  if (!parsed || typeof parsed !== 'object') throw new Error('invalid JSON from Qwen')
  const out = parsed as Record<string, unknown>

  const wq = ((out.word_quality ?? {}) as Record<string, unknown>)
  for (const key of Object.keys(wq)) {
    if (!transcriptText.includes(key)) {
      delete wq[key]
      continue
    }
    wq[key] = Math.max(0, Math.min(5, Number(wq[key])))
  }
  out.word_quality = wq

  if (!Array.isArray(out.mistakes)) out.mistakes = []

  return out
}
