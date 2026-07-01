import { NextRequest, NextResponse } from 'next/server'
import { getMistakes } from '@/lib/stats'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)

  return NextResponse.json(getMistakes({ limit }))
}
