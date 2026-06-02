import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  if (!from || !to) return NextResponse.json({ error: 'from et to requis' }, { status: 400 })

  const db = getDb()
  const reservations = db.prepare(`
    SELECT r.*, p.name as property_name
    FROM reservations r
    JOIN properties p ON r.property_id = p.id
    WHERE r.status != 'cancelled'
      AND r.checkin_date < ? AND r.checkout_date > ?
    ORDER BY r.checkin_date
  `).all(to, from)

  return NextResponse.json(reservations)
}
