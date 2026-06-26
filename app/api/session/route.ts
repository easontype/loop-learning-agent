import { NextRequest, NextResponse } from 'next/server'
import { buildSystemPrompt } from '@/lib/prompt'
import { Persona } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const persona: Persona = body.persona
    const todayWords: string[] = body.todayWords ?? []
    const instructions = buildSystemPrompt(persona, todayWords)
    const model = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime-mini'

    const res = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // client_secrets only accepts minimal config; rest goes via session.update after WS connect
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
    // Response has top-level "value" (ek_... token) and "expires_at"
    const clientSecret = data.value ?? data.client_secret?.value
    const expiresAt = data.expires_at ?? data.client_secret?.expires_at

    return NextResponse.json({ clientSecret, expiresAt, model, instructions, voice: persona.voice })
  } catch (err) {
    console.error('[session] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
