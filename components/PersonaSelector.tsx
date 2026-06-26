'use client'

import { Persona, DEFAULT_PERSONAS } from '@/lib/types'

interface Props {
  selected: Persona
  onChange: (p: Persona) => void
  disabled: boolean
}

const FLAG: Record<string, string> = { en: '🇺🇸', ja: '🇯🇵' }
const LEVEL_COLOR: Record<string, string> = {
  A1: 'text-green-400', A2: 'text-green-400',
  B1: 'text-yellow-400', B2: 'text-yellow-400',
  C1: 'text-red-400', C2: 'text-red-400',
}

export default function PersonaSelector({ selected, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
      {DEFAULT_PERSONAS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p)}
          disabled={disabled}
          className={`
            flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all
            ${selected.id === p.id
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
          `}
        >
          <span className="text-lg">{FLAG[p.language]}</span>
          <span className="text-sm font-semibold text-zinc-100">{p.name}</span>
          <span className="text-xs text-zinc-400">{p.description}</span>
          <span className={`text-xs font-mono ${LEVEL_COLOR[p.level]}`}>{p.level}</span>
        </button>
      ))}
    </div>
  )
}
