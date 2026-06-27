import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { transcript_items } from '@/lib/schema'

interface TranscriptItem {
  role: string
  text: string
  seq: number
}

export async function POST(req: NextRequest) {
  const { session_id, items } = await req.json() as { session_id: number; items: TranscriptItem[] }

  if (!session_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  db.insert(transcript_items)
    .values(items.map((it) => ({ session_id, role: it.role, text: it.text, seq: it.seq })))
    .onConflictDoNothing()
    .run()

  return NextResponse.json({ ok: true })
}
