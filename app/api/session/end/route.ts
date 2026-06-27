import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sessions, jobs } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'missing session_id' }, { status: 400 })

  const session = db.select().from(sessions).where(eq(sessions.id, session_id)).limit(1).all()[0]
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const now = Math.floor(Date.now() / 1000)
  const duration_s = session.started_at ? now - session.started_at : null

  db.transaction((tx) => {
    tx.update(sessions)
      .set({ ended_at: now, duration_s })
      .where(eq(sessions.id, session_id))
      .run()

    tx.insert(jobs).values({
      type: 'post_session_analysis',
      session_id,
      status: 'pending',
    }).run()
  })

  return NextResponse.json({ ok: true })
}
