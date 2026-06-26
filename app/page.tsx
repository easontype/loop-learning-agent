'use client'

import { useState } from 'react'
import { DEFAULT_PERSONAS, Persona } from '@/lib/types'
import ConversationView from '@/components/ConversationView'
import PersonaSelector from '@/components/PersonaSelector'

export default function Home() {
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONAS[0])

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-12 gap-10">
      {/* Header */}
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Lingua A8</h1>
        <p className="text-zinc-500 text-sm">全雙工 AI 語言對話練習</p>
      </div>

      {/* Persona Selector */}
      <div className="flex flex-col items-center gap-3 w-full max-w-sm">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">選擇對話對象</p>
        <PersonaSelector
          selected={persona}
          onChange={setPersona}
          disabled={false}
        />
      </div>

      {/* Conversation */}
      <ConversationView
        persona={persona}
        key={persona.id}
      />
    </main>
  )
}
