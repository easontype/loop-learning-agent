import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { words, word_progress } from '@/lib/schema'
import { lte, asc, eq, sql } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { tool, args } = await req.json()

  if (tool === 'get_next_word') {
    const rows = db
      .select({
        word: words.word,
        reading: words.reading,
        definition: words.definition,
        example: words.example,
      })
      .from(word_progress)
      .innerJoin(words, eq(words.id, word_progress.word_id))
      .where(lte(word_progress.next_review, sql`unixepoch()`))
      .orderBy(asc(word_progress.next_review), asc(word_progress.ease_factor))
      .limit(1)
      .all()

    return NextResponse.json({ result: rows[0] ?? null })
  }

  if (tool === 'get_word_definition') {
    const { word, language } = args ?? {}
    if (!word) return NextResponse.json({ error: 'missing word' }, { status: 400 })

    const row = db
      .select({ definition: words.definition, reading: words.reading, example: words.example })
      .from(words)
      .where(eq(words.word, word))
      .limit(1)
      .all()[0]

    if (row) return NextResponse.json({ result: row })

    // Fallback: Free Dictionary API (English only)
    if (!language || language === 'en') {
      try {
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
        if (res.ok) {
          const data = await res.json()
          const meaning = data[0]?.meanings?.[0]?.definitions?.[0]
          return NextResponse.json({
            result: {
              definition: meaning?.definition ?? '',
              example: meaning?.example ?? null,
              reading: null,
            },
          })
        }
      } catch {}
    }

    return NextResponse.json({ result: null })
  }

  return NextResponse.json({ error: 'unknown tool' }, { status: 400 })
}
