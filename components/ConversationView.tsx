'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Persona, SessionStatus, SpeakingState, TranscriptEntry } from '@/lib/types'
import AudioVisualizer from './AudioVisualizer'

const WS_URL = 'wss://api.openai.com/v1/realtime'

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function pcm16Base64ToAudioBuffer(
  ctx: AudioContext,
  b64: string,
): AudioBuffer {
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

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const stopAIAudio = useCallback(() => {
    isAIPlayingRef.current = false
    nextPlayTimeRef.current = audioCtxRef.current?.currentTime ?? 0
    setSpeakingState((s) => (s === 'ai' ? 'idle' : s))
    setVolume(0)
  }, [])

  const enqueueAIAudio = useCallback((b64: string) => {
    const ctx = audioCtxRef.current
    if (!ctx) return
    const buffer = pcm16Base64ToAudioBuffer(ctx, b64)
    const source = ctx.createBufferSource()
    source.buffer = buffer

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyser.connect(ctx.destination)

    const now = ctx.currentTime
    const start = Math.max(now, nextPlayTimeRef.current)
    source.start(start)
    nextPlayTimeRef.current = start + buffer.duration
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

  const handleMessage = useCallback(
    (raw: string) => {
      const msg = JSON.parse(raw)
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

        // GA event names
        case 'response.output_audio.delta':
          enqueueAIAudio(msg.delta)
          break

        case 'response.output_audio_transcript.delta':
          setTranscript((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...last, text: last.text + msg.delta },
              ]
            }
            return [
              ...prev,
              { id: crypto.randomUUID(), role: 'assistant', text: msg.delta, timestamp: Date.now() },
            ]
          })
          break

        case 'input_audio.transcription.completed':
        case 'conversation.item.input_audio_transcription.completed':
          if (msg.transcript?.trim()) {
            setTranscript((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: 'user', text: msg.transcript, timestamp: Date.now() },
            ])
          }
          break

        case 'response.cancelled':
          stopAIAudio()
          break

        case 'response.done':
          isAIPlayingRef.current = false
          setTimeout(() => {
            setSpeakingState((s) => (s === 'ai' ? 'idle' : s))
            setVolume(0)
          }, 300)
          break

        case 'error':
          console.error('Realtime error full msg:', JSON.stringify(msg))
          break
      }
    },
    [enqueueAIAudio, stopAIAudio],
  )

  const connect = useCallback(async () => {
    setStatus('connecting')
    setTranscript([])

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona }),
      })
      if (!res.ok) throw new Error('Session creation failed')
      const { clientSecret, model, instructions, voice } = await res.json()

      // AudioContext at 24kHz (OpenAI Realtime native rate)
      const ctx = new AudioContext({ sampleRate: 24000 })
      audioCtxRef.current = ctx
      await ctx.audioWorklet.addModule('/audio-processor.js')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      const micSource = ctx.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(ctx, 'audio-processor')
      micSource.connect(worklet)

      // Connect to OpenAI Realtime via WebSocket subprotocol auth
      const ws = new WebSocket(`${WS_URL}?model=${model}`, [
        'realtime',
        `openai-insecure-api-key.${clientSecret}`,
      ])
      wsRef.current = ws

      ws.onopen = () => {
        // Configure session after connecting
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            type: 'realtime',
            output_modalities: ['audio'],
            instructions,
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                turn_detection: { type: 'semantic_vad' },
              },
              output: {
                format: { type: 'audio/pcm' },
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

      // Stream PCM16 mic audio to OpenAI
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

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    wsRef.current = null
    streamRef.current = null
    audioCtxRef.current = null
    isAIPlayingRef.current = false
    setStatus('idle')
    setSpeakingState('idle')
    setVolume(0)
  }, [])

  useEffect(() => () => disconnect(), [disconnect])

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
