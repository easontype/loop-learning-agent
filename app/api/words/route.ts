import { NextRequest, NextResponse } from 'next/server'
import { getWordProgress } from '@/lib/stats'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const language = searchParams.get('language') ?? 'en'
  const limit = Number(searchParams.get('limit') ?? 50)

  return NextResponse.json(getWordProgress({ language, limit }))
}
