'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Persona, SessionStatus, SpeakingState, TranscriptEntry } from '@/lib/types'
import AudioVisualizer from './AudioVisualizer'

const WS_URL = 'wss://api.openai.com/v1/realtime'

const TOOLS = [
  {
    type: 'function',
    name: 'get_next_word',
    description: 'Get the next vocabulary word due for spaced repetition review. Call this when you want to introduce a new practice word.',
    parameters: {
      type: 'object',
      properties: {
        language: { type: 'string', enum: ['en', 'ja'], description: 'Language of the word' },
      },
    },
  },
  {
    type: 'function',
    name: 'get_word_definition',
    description: 'Look up the definition of a specific word in the vocabulary database.',
    parameters: {
      type: 'object',
      properties: {
        word: { type: 'string', description: 'The word to look up' },
        language: { type: 'string', enum: ['en', 'ja'], description: 'Language of the word' },
      },
      required: ['word'],
    },
  },
]

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function pcm16Base64ToAudioBuffer(ctx: AudioContext, b64: string): AudioBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const int16 = new Int16Array(bytes.buffer)
  const float32 = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff)
  }
  const buf = ctx.createBuffer(1, float32.length, 24000)
  buf.getChannelData(0).set(float32)
  return buf
}

interface Props {
  persona: Persona
}

export default function ConversationView({ persona }: Props) {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [speakingState, setSpeakingState] = useState<SpeakingState>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [volume, setVolume] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const nextPlayTimeRef = useRef(0)
  const isAIPlayingRef = useRef(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([])
  const playbackStartRef = useRef<number | null>(null)
  const currentItemIdRef = useRef<string | null>(null)
  const enqueuedMsRef = useRef(0)
  const interruptedRef = useRef(false)

  // Session tracking
  const sessionIdRef = useRef<number | null>(null)

  // Transcript flush buffer — only complete entries (user utterance + AI response.done)
  const flushBufferRef = useRef<TranscriptEntry[]>([])
  const flushedCountRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Accumulate AI delta text until response.done
  const currentAIEntryRef = useRef<TranscriptEntry | null>(null)

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const flushTranscript = useCallback(async () => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return
    const buf = flushBufferRef.current
    const flushed = flushedCountRef.current
    const pending = buf.slice(flushed)
    if (pending.length === 0) return

    const items = pending.map((entry, i) => ({
      role: entry.role,
      text: entry.text,
      seq: flushed + i,
    }))

    try {
      await fetch('/api/transcript/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, items }),
      })
      flushedCountRef.current += pending.length
    } catch (e) {
      console.error('[transcript] flush failed', e)
    }
  }, [])

  const scheduleFlush = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(flushTranscript, 10_000)
  }, [flushTranscript])

  // Add a complete entry to both display state and flush buffer
  const addCompleteEntry = useCallback((entry: TranscriptEntry) => {
    flushBufferRef.current = [...flushBufferRef.current, entry]
    setTranscript((prev) => [...prev, entry])
    scheduleFlush()
  }, [scheduleFlush])

  const stopAIAudio = useCallback(() => {
    const ctx = audioCtxRef.current
    for (const s of activeSourcesRef.current) {
      try { s.onended = null; s.stop() } catch {}
      try { s.disconnect() } catch {}
    }
    activeSourcesRef.current = []

    if (ctx && currentItemIdRef.current && playbackStartRef.current !== null
        && wsRef.current?.readyState === WebSocket.OPEN) {
      const elapsedMs = (ctx.currentTime - playbackStartRef.current) * 1000
      const playedMs = Math.max(0, Math.floor(Math.min(elapsedMs, enqueuedMsRef.current)))
      wsRef.current.send(JSON.stringify({
        type: 'conversation.item.truncate',
        item_id: currentItemIdRef.current,
        content_index: 0,
        audio_end_ms: playedMs,
      }))
    }

    interruptedRef.current = true
    nextPlayTimeRef.current = ctx?.currentTime ?? 0
    playbackStartRef.current = null
    currentItemIdRef.current = null
    isAIPlayingRef.current = false
    setSpeakingState((s) => (s === 'ai' ? 'idle' : s))
    setVolume(0)
  }, [])

  const enqueueAIAudio = useCallback((msg: { delta: string; item_id?: string }) => {
    const ctx = audioCtxRef.current
    if (!ctx || interruptedRef.current) return

    if (msg.item_id) currentItemIdRef.current = msg.item_id

    const buffer = pcm16Base64ToAudioBuffer(ctx, msg.delta)
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(ctx.destination)

    const now = ctx.currentTime
    const start = Math.max(now, nextPlayTimeRef.current)

    if (playbackStartRef.current === null) {
      playbackStartRef.current = start
      enqueuedMsRef.current = 0
    }

    source.start(start)
    nextPlayTimeRef.current = start + buffer.duration
    enqueuedMsRef.current += buffer.duration * 1000

    activeSourcesRef.current.push(source)
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source)
      source.disconnect()
      analyser.disconnect()
    }

    isAIPlayingRef.current = true
    setSpeakingState('ai')

    const data = new Uint8Array(analyser.frequencyBinCount)
    const tick = () => {
      if (!isAIPlayingRef.current) return
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setVolume(avg / 128)
      requestAnimationFrame(tick)
    }
    tick()
  }, [])

  const handleToolCall = useCallback(async (item: { name: string; arguments: string; call_id: string }) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    let args: Record<string, unknown> = {}
    try { args = JSON.parse(item.arguments || '{}') } catch {}

    // Force the current persona's language regardless of what the model passed —
    // the session must never surface words from the other language.
    if (item.name === 'get_next_word') args.language = persona.language

    let result: unknown = null
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: item.name, args }),
      })
      const data = await res.json()
      result = data.result
    } catch (e) {
      console.error('[tool] call failed', e)
    }

    // Send tool result back to OpenAI
    ws.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: item.call_id,
        output: JSON.stringify(result),
      },
    }))

    // Prompt model to continue
    ws.send(JSON.stringify({ type: 'response.create' }))
  }, [persona])

  const handleMessage = useCallback(
    (raw: string) => {
      const msg = JSON.parse(raw)
      if (msg.type === 'session.updated' || msg.type === 'error' || msg.type.includes('transcription')) {
        console.log('[ws debug]', msg.type, JSON.stringify(msg))
      } else {
        console.log('[ws debug] type:', msg.type)
      }
      switch (msg.type) {
        case 'input_audio_buffer.speech_started':
          stopAIAudio()
          setSpeakingState('user')
          setVolume(0.6)
          break

        case 'input_audio_buffer.speech_stopped':
          setSpeakingState('idle')
          setVolume(0)
          break

        case 'response.created':
          interruptedRef.current = false
          playbackStartRef.current = null
          currentAIEntryRef.current = null
          break

        case 'response.output_audio.delta':
          enqueueAIAudio(msg)
          break

        case 'response.output_audio_transcript.delta': {
          const delta = msg.delta as string
          if (!currentAIEntryRef.current) {
            const entry: TranscriptEntry = {
              id: crypto.randomUUID(),
              role: 'assistant',
              text: delta,
              timestamp: Date.now(),
            }
            currentAIEntryRef.current = entry
            setTranscript((prev) => [...prev, entry])
          } else {
            const updated = { ...currentAIEntryRef.current, text: currentAIEntryRef.current.text + delta }
            currentAIEntryRef.current = updated
            const id = updated.id
            setTranscript((prev) => {
              const idx = prev.findIndex((e) => e.id === id)
              if (idx < 0) return prev
              return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)]
            })
          }
          break
        }

        case 'input_audio.transcription.completed':
        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript?.trim()) {
            addCompleteEntry({
              id: crypto.randomUUID(),
              role: 'user',
              text: msg.transcript,
              timestamp: Date.now(),
            })
          }
          break

        case 'response.output_item.done':
          if (msg.item?.type === 'function_call') {
            handleToolCall(msg.item)
          }
          break

        case 'response.cancelled':
          stopAIAudio()
          break

        case 'response.done':
          isAIPlayingRef.current = false
          playbackStartRef.current = null
          currentItemIdRef.current = null
          // Commit completed AI entry to flush buffer
          if (currentAIEntryRef.current) {
            flushBufferRef.current = [...flushBufferRef.current, currentAIEntryRef.current]
            currentAIEntryRef.current = null
            scheduleFlush()
          }
          setTimeout(() => {
            setSpeakingState((s) => (s === 'ai' ? 'idle' : s))
            setVolume(0)
          }, 300)
          break

        case 'error':
          console.error('Realtime error:', JSON.stringify(msg))
          break
      }
    },
    [enqueueAIAudio, stopAIAudio, addCompleteEntry, scheduleFlush, handleToolCall],
  )

  const connect = useCallback(async () => {
    setStatus('connecting')
    setTranscript([])
    flushBufferRef.current = []
    flushedCountRef.current = 0
    currentAIEntryRef.current = null
    sessionIdRef.current = null

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      })
      if (!res.ok) throw new Error('Session creation failed')
      const { clientSecret, model, instructions, voice, sessionId } = await res.json()

      sessionIdRef.current = sessionId ?? null

      const ctx = new AudioContext({ sampleRate: 24000 })
      audioCtxRef.current = ctx
      await ctx.audioWorklet.addModule('/audio-processor.js')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      streamRef.current = stream

      const micSource = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'audio-processor')
      micSource.connect(worklet)

      const ws = new WebSocket(`${WS_URL}?model=${model}`, [
        'realtime',
        `openai-insecure-api-key.${clientSecret}`,
      ])
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            output_modalities: ['audio'],
            instructions,
            tools: TOOLS,
            tool_choice: 'auto',
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                turn_detection: { type: 'server_vad', silence_duration_ms: 700 },
                transcription: { model: 'gpt-realtime-whisper' },
              },
              output: {
                format: { type: 'audio/pcm', rate: 24000 },
                voice,
              },
            },
          },
        }))
        setStatus('active')
        nextPlayTimeRef.current = 0
      }

      ws.onmessage = (e) => handleMessage(e.data)
      ws.onerror = () => setStatus('error')
      ws.onclose = () => {
        setStatus('idle')
        setSpeakingState('idle')
        setVolume(0)
      }

      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: toBase64(e.data),
        }))
      }
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }, [persona, handleMessage])

  const disconnect = useCallback(async () => {
    // Flush remaining transcript
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    await flushTranscript()

    // Signal session end
    if (sessionIdRef.current) {
      fetch('/api/session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionIdRef.current }),
      }).catch(console.error)
    }

    wsRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    wsRef.current = null
    streamRef.current = null
    audioCtxRef.current = null
    isAIPlayingRef.current = false
    sessionIdRef.current = null
    setStatus('idle')
    setSpeakingState('idle')
    setVolume(0)
  }, [flushTranscript])

  useEffect(() => () => { disconnect() }, [disconnect])

  const statusLabel: Record<SessionStatus, string> = {
    idle: '尚未開始',
    connecting: '連線中...',
    active: speakingState === 'ai' ? 'AI 說話中' : speakingState === 'user' ? '你說話中' : '聆聽中',
    error: '連線失敗',
  }

  const statusColor: Record<SessionStatus, string> = {
    idle: 'text-zinc-500',
    connecting: 'text-yellow-400',
    active: speakingState === 'user' ? 'text-emerald-400' : 'text-indigo-400',
    error: 'text-red-400',
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      {/* Avatar + Visualizer */}
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
          {persona.name[0]}
        </div>
        <p className="text-zinc-300 font-medium">{persona.name}</p>
        <p className={`text-sm font-mono ${statusColor[status]}`}>
          {statusLabel[status]}
        </p>
      </div>

      <AudioVisualizer state={speakingState} volume={volume} />

      {/* Transcript */}
      <div className="w-full h-56 overflow-y-auto rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
        {transcript.length === 0 && (
          <p className="text-zinc-600 text-sm text-center mt-8">對話逐字稿將顯示於此</p>
        )}
        {transcript.map((entry) => (
          <div
            key={entry.id}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                entry.role === 'user'
                  ? 'bg-emerald-600/30 text-emerald-100'
                  : 'bg-indigo-600/30 text-indigo-100'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}
        <div ref={transcriptEndRef} />
      </div>

      {/* Controls */}
      {status === 'idle' || status === 'error' ? (
        <button
          onClick={connect}
          className="w-full max-w-xs h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-colors shadow-lg"
        >
          開始對話
        </button>
      ) : (
        <button
          onClick={disconnect}
          className="w-full max-w-xs h-14 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-lg transition-colors"
        >
          {status === 'connecting' ? '連線中...' : '結束對話'}
        </button>
      )}

      {status === 'error' && (
        <p className="text-red-400 text-sm">連線失敗，請確認 API Key 並重試。</p>
      )}
    </div>
  )
}
