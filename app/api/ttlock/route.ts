import { NextResponse } from 'next/server'
import { listLocks } from '@/lib/ttlock'

export async function GET() {
  try {
    const locks = await listLocks()
    return NextResponse.json({ ok: true, locks })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
