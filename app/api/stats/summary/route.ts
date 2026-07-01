import { NextResponse } from 'next/server'
import { getSummaryStats } from '@/lib/stats'

export async function GET() {
  return NextResponse.json(getSummaryStats())
}
