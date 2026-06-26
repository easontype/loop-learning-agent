export type Language = 'en' | 'ja'
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type ConversationStyle = 'casual' | 'formal' | 'teacher' | 'friend'
export type CorrectionStyle = 'gentle' | 'strict' | 'none'
export type RealtimeVoice = 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse'

export interface Persona {
  id: string
  name: string
  language: Language
  style: ConversationStyle
  level: CEFRLevel
  correctionStyle: CorrectionStyle
  voice: RealtimeVoice
  description: string
}

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'yuki-casual',
    name: 'Yuki',
    language: 'ja',
    style: 'casual',
    level: 'B1',
    correctionStyle: 'gentle',
    voice: 'shimmer',
    description: '日本朋友，輕鬆聊天',
  },
  {
    id: 'sensei-strict',
    name: 'Yamamoto Sensei',
    language: 'ja',
    style: 'teacher',
    level: 'B2',
    correctionStyle: 'strict',
    voice: 'echo',
    description: '嚴格的日語老師',
  },
  {
    id: 'emma-casual',
    name: 'Emma',
    language: 'en',
    style: 'friend',
    level: 'B2',
    correctionStyle: 'gentle',
    voice: 'coral',
    description: '英文母語朋友',
  },
  {
    id: 'alex-teacher',
    name: 'Alex',
    language: 'en',
    style: 'teacher',
    level: 'C1',
    correctionStyle: 'strict',
    voice: 'ash',
    description: '英文老師，IELTS 訓練',
  },
]

export type SessionStatus = 'idle' | 'connecting' | 'active' | 'error'
export type SpeakingState = 'idle' | 'user' | 'ai'

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: number
}
