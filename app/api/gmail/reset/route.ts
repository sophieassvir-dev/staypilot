import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function POST() {
  const db = getDb()
  db.prepare('DELETE FROM gmail_synced').run()
  db.prepare("DELETE FROM reservations WHERE source = 'gmail' OR source IS NULL OR source = 'manual'").run()
  return NextResponse.json({ ok: true })
}
