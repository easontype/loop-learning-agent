import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/prompt'
import { searchMemories } from '@/lib/lance'
import { Persona } from '@/lib/types'
import { db } from '@/lib/db'
import { words, word_progress, sessions } from '@/lib/schema'
import { lte, asc, eq, sql, and } from 'drizzle-orm'

function querySRSWords(language: string, limit = 8) {
  return db
    .select({
      word: words.word,
      reading: words.reading,
      definition: words.definition,
      example: words.example,
    })
    .from(word_progress)
    .innerJoin(words, eq(words.id, word_progress.word_id))
    .where(and(lte(word_progress.next_review, sql`unixepoch()`), eq(words.language, language)))
    .orderBy(asc(word_progress.next_review), asc(word_progress.ease_factor))
    .limit(limit)
    .all()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const persona: Persona = body.persona

    // Query SRS words due for review
    const srsWords = querySRSWords(persona.language)
    const todayWords = srsWords.map((w) =>
      w.reading ? `${w.word}（${w.reading}）: ${w.definition}` : `${w.word}: ${w.definition}`
    )

    let memories: string[] = []
    try {
      const recs = await searchMemories(
        persona.language + ' ' + todayWords.join(' '),
        persona.language,
        3
      )
      memories = recs.map((r) => {
        const date = new Date(r.created_at * 1000).toISOString().slice(0, 10)
        return `${date}：${r.summary}`
      })
    } catch { /* LanceDB not yet initialized — skip */ }

    const instructions = buildSystemPrompt(persona, todayWords, memories)
    const model = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime-mini'

    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: { type: 'realtime', model },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[session] OpenAI error:', err)
      return NextResponse.json({ error: err }, { status: 502 })
    }

    const data = await res.json()
    const clientSecret = data.value ?? data.client_secret?.value
    const expiresAt = data.expires_at ?? data.client_secret?.expires_at

    // Create session record
    const now = Math.floor(Date.now() / 1000)
    const inserted = db
      .insert(sessions)
      .values({ language: persona.language, persona: persona.id, started_at: now })
      .returning({ id: sessions.id })
      .get()

    return NextResponse.json({
      clientSecret,
      expiresAt,
      model,
      instructions,
      voice: persona.voice,
      sessionId: inserted.id,
    })
  } catch (err) {
    console.error('[session] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
