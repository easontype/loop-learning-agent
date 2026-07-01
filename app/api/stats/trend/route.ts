import { NextResponse } from 'next/server'
import { getWeeklyTrend } from '@/lib/stats'

export async function GET() {
  return NextResponse.json(getWeeklyTrend())
}
