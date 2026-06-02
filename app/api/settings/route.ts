import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST(req: NextRequest) {
  const db = getDb()
  const body = await req.json()
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(body)) {
    upsert.run(key, String(value))
  }
  return NextResponse.json({ ok: true })
}
