'use client'

import { useEffect, useRef } from 'react'
import { SpeakingState } from '@/lib/types'

interface Props {
  state: SpeakingState
  volume: number // 0–1
}

const BAR_COUNT = 24

export default function AudioVisualizer({ state, volume }: Props) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    let frame: number
    let tick = 0

    const animate = () => {
      tick++
      barsRef.current.forEach((bar, i) => {
        if (!bar) return
        let height: number
        if (state === 'idle') {
          height = 4
        } else {
          // Sine wave with randomness, driven by volume
          const wave = Math.sin(tick * 0.08 + i * 0.4) * 0.5 + 0.5
          const rand = Math.random() * 0.3
          height = 4 + (wave + rand) * volume * 48
        }
        bar.style.height = `${height}px`
      })
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [state, volume])

  const activeColor =
    state === 'user' ? 'bg-emerald-400' : state === 'ai' ? 'bg-indigo-400' : 'bg-zinc-600'

  return (
    <div className="flex items-center justify-center gap-[3px] h-16">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el }}
          className={`w-1.5 rounded-full transition-colors duration-300 ${activeColor}`}
          style={{ height: '4px' }}
        />
      ))}
    </div>
  )
}
