import { NextRequest, NextResponse } from 'next/server'
import { syncProperty, syncAllProperties } from '@/lib/ical-sync'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const results = body.property_id
    ? [await syncProperty(parseInt(body.property_id))]
    : await syncAllProperties()
  return NextResponse.json({ ok: true, results })
}

// Route pour Vercel Cron — GET /api/sync
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const results = await syncAllProperties()
  return NextResponse.json({ ok: true, results })
}
