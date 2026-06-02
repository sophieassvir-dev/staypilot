import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { runScheduler } from '@/lib/scheduler'

export async function POST() {
  const db = getDb()
  const result = await runScheduler(db)
  return NextResponse.json(result)
}

// Appelé automatiquement par Vercel Cron
export async function GET() {
  const db = getDb()
  const result = await runScheduler(db)
  return NextResponse.json(result)
}
